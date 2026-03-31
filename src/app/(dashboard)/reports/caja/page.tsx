"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Clock, Banknote, CreditCard, Smartphone, TrendingUp, 
  TrendingDown, CheckCircle2, XCircle, User, Calendar,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";

type Sesion = {
  id: string;
  created_at: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: string;
  monto_apertura: number;
  monto_cierre_real: number | null;
  monto_cierre_esperado: number | null;
  diferencia: number | null;
  observaciones: string | null;
  usuarios?: { nombre: string } | null;
  cajas?: { nombre: string } | null;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

export default function ReporteCajaPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);

  useEffect(() => {
    if (tenant) fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sesiones_caja")
      .select(`
        *,
        usuarios (nombre)
      `)
      .eq("tenant_id", tenant!.id)
      .order("created_at", { ascending: false });
    if (data) setSesiones(data as any);
    setLoading(false);
  };

  const selectSesion = async (sesion: Sesion) => {
    setSelected(sesion);
    const { data } = await supabase
      .from("caja_movimientos")
      .select("*")
      .eq("sesion_id", sesion.id)
      .order("created_at", { ascending: false });
    setMovimientos(data || []);
  };

  const totalVentas = (movs: any[]) =>
    movs.filter((m) => m.tipo === "venta").reduce((a, m) => a + m.monto, 0);
  const totalEfectivo = (movs: any[]) =>
    movs.filter((m) => m.metodo_pago === "efectivo").reduce((a, m) => a + m.monto, 0);
  const totalTarjeta = (movs: any[]) =>
    movs.filter((m) => m.metodo_pago === "tarjeta").reduce((a, m) => a + m.monto, 0);
  const totalTransferencia = (movs: any[]) =>
    movs.filter((m) => m.metodo_pago === "transferencia").reduce((a, m) => a + m.monto, 0);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Banknote className="w-8 h-8 text-amber-600" /> Cierre de Caja
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Historial de turnos, arqueos y resumen de pagos por sesión
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 flex-1 min-h-0">
        {/* Session List */}
        <div className="xl:col-span-2 bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Turnos Registrados</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Haz clic en un turno para ver el detalle</p>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="p-16 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando...</p>
              </div>
            ) : sesiones.length === 0 ? (
              <div className="p-16 text-center opacity-30">
                <Banknote className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-xs font-black text-slate-400 italic">Sin sesiones registradas</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {sesiones.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSesion(s)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border-2 transition-all group",
                      selected?.id === s.id
                        ? "bg-amber-50 border-amber-300 shadow-md"
                        : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          s.estado === "abierta" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        )} />
                        <span className="font-black text-slate-800 text-sm">
                          {(s as any).cajas?.nombre || "Caja Principal"}
                        </span>
                      </div>
                      <Badge className={cn(
                        "rounded-lg font-black text-[9px] uppercase tracking-wider border py-0.5 px-2",
                        s.estado === "abierta"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {s.estado}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mb-1">
                      <User className="w-3 h-3" /> {(s as any).usuarios?.nombre || "Cajero"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(s.fecha_apertura).toLocaleString("es-CO", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Detail */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {!selected ? (
            <div className="flex-1 bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl flex items-center justify-center">
              <div className="text-center opacity-30 p-12">
                <Banknote className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-black text-slate-400 uppercase text-sm italic">Selecciona un turno para ver el detalle</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Apertura", val: fmt(selected.monto_apertura || 0), icon: CheckCircle2, color: "emerald" },
                  { label: "Total Vendido", val: fmt(totalVentas(movimientos)), icon: ShoppingBag, color: "violet" },
                  { label: "Cierre Real", val: fmt(selected.monto_cierre_real || 0), icon: Banknote, color: "amber" },
                  { label: "Diferencia", val: fmt(Math.abs(selected.diferencia || 0)), icon: selected.diferencia >= 0 ? TrendingUp : TrendingDown, color: (selected.diferencia || 0) >= 0 ? "emerald" : "rose" },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
                      <k.icon className={cn("w-4 h-4", `text-${k.color}-500`)} />
                    </div>
                    <p className="text-xl font-black text-slate-800">{k.val}</p>
                  </div>
                ))}
              </div>

              {/* Payment Breakdown */}
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl p-6">
                <p className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Desglose por Método de Pago</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Efectivo", val: totalEfectivo(movimientos), icon: Banknote, color: "emerald" },
                    { label: "Tarjeta", val: totalTarjeta(movimientos), icon: CreditCard, color: "sky" },
                    { label: "Digital", val: totalTransferencia(movimientos), icon: Smartphone, color: "violet" },
                  ].map((k) => (
                    <div key={k.label} className={cn("rounded-2xl p-4 border", `border-${k.color}-100 bg-${k.color}-50`)}>
                      <k.icon className={cn("w-5 h-5 mb-2", `text-${k.color}-600`)} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{k.label}</p>
                      <p className={cn("font-black text-lg", `text-${k.color}-700`)}>{fmt(k.val)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Movements Table */}
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden flex-1">
                <div className="p-6 border-b border-slate-100">
                  <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Movimientos del Turno</p>
                </div>
                <div className="overflow-auto max-h-64">
                  {movimientos.length === 0 ? (
                    <div className="p-8 text-center opacity-30">
                      <p className="text-xs font-black text-slate-400 italic">Sin movimientos</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80">
                          <TableHead className="pl-6 font-black text-[10px] text-slate-400 uppercase tracking-widest h-11">Tipo</TableHead>
                          <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-11">Descripción</TableHead>
                          <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-11 text-center">Método</TableHead>
                          <TableHead className="pr-6 font-black text-[10px] text-slate-400 uppercase tracking-widest h-11 text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientos.map((m) => (
                          <TableRow key={m.id} className="border-b border-slate-50">
                            <TableCell className="pl-6 py-3">
                              <Badge className={cn(
                                "rounded-lg font-black text-[9px] uppercase tracking-wider border py-0.5 px-2",
                                m.tipo === "venta" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                m.tipo === "retiro" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-slate-100 text-slate-500 border-slate-200"
                              )}>
                                {m.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-bold text-slate-600">{m.descripcion || "—"}</TableCell>
                            <TableCell className="text-center text-xs font-bold text-slate-500">{m.metodo_pago}</TableCell>
                            <TableCell className="pr-6 text-right font-black text-slate-800">{fmt(m.monto)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
