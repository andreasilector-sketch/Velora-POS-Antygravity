"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  History,
  Calendar,
  Truck,
  FileText,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AccountsPayablePage() {
  const { tenant, profile } = useUserProfile();
  const [deudas, setDeudas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (tenant) {
      fetchDeudas();
    }
  }, [tenant]);

  const fetchDeudas = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("ingresos_inventario" as any) as any)
      .select("*")
      .eq("tenant_id", tenant?.id)
      .eq("tipo_pago", "credito")
      .order("created_at", { ascending: false });

    if (data) setDeudas(data);
    setLoading(false);
  };

  const [paymentModal, setPaymentModal] = useState<{isOpen: boolean, deuda: any}>({isOpen: false, deuda: null});
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [isPaying, setIsPaying] = useState(false);

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { deuda } = paymentModal;
    if (!deuda || !profile) return;
    setIsPaying(true);

    try {
      // 1. Update ingresos_inventario state (change to contado to remove from payable)
      const { error: errUpdate } = await (supabase.from("ingresos_inventario" as any) as any)
        .update({ tipo_pago: "contado", metodo_pago: metodoPago })
        .eq("id", deuda.id);
      
      if (errUpdate) throw errUpdate;

      // 2. Insert Gasto
      const { error: errGasto } = await (supabase.from("gastos" as any) as any)
        .insert({
          tenant_id: tenant?.id,
          categoria: "Proveedores",
          descripcion: `Pago Factura ${deuda.numero_factura} - Proveedor ${deuda.proveedor}`,
          monto: deuda.total,
          metodo_pago: metodoPago,
          fecha: new Date().toISOString()
        });
      
      if (errGasto) throw errGasto;

      // 3. If Cash, insert into caja_movimientos
      if (metodoPago === "efectivo" && profile?.id) {
        // Find active session
        const { data: session } = await (supabase.from("sesiones_caja" as any) as any)
          .select("id")
          .eq("usuario_id", profile.id)
          .eq("estado", "abierta")
          .maybeSingle();

        if (session) {
          await (supabase.from("caja_movimientos" as any) as any).insert({
            sesion_id: session.id,
            tipo: "egreso",
            monto: deuda.total,
            metodo_pago: "efectivo",
            descripcion: `Pago Factura ${deuda.numero_factura} (${deuda.proveedor})`
          });
        }
      }

      alert("Pago registrado correctamente.");
      setPaymentModal({isOpen: false, deuda: null});
      fetchDeudas();
    } catch (err: any) {
      alert("Error al registrar pago: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  const getDueDate = (fecha: string, dias: number) => {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  };

  const isOverdue = (fecha: string, dias: number) => {
    const due = getDueDate(fecha, dias);
    return due < new Date();
  };

  const totalDeuda = deudas.reduce((acc, d) => acc + Number(d.total), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden font-sans">
      
      <Dialog open={paymentModal.isOpen} onOpenChange={(open) => setPaymentModal(prev => ({...prev, isOpen: open}))}>
        <DialogContent className="max-w-md bg-white border-slate-100 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Pagar Cuenta</DialogTitle>
          </DialogHeader>
          {paymentModal.deuda && (
            <form onSubmit={handlePagar} className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-bold text-slate-500">Proveedor: <span className="text-slate-800">{paymentModal.deuda.proveedor}</span></p>
                <p className="text-sm font-bold text-slate-500">Factura: <span className="text-slate-800">{paymentModal.deuda.numero_factura}</span></p>
                <p className="text-lg font-black text-slate-900 mt-2">Monto a Pagar: <span className="text-indigo-600">{formatCurrency(paymentModal.deuda.total)}</span></p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Método de Pago</Label>
                <select 
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700"
                >
                   <option value="efectivo">Efectivo (Caja)</option>
                   <option value="transferencia">Transferencia Bancaria</option>
                   <option value="tarjeta">Tarjeta Débito/Crédito</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentModal({isOpen: false, deuda: null})} className="flex-1 rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={isPaying} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black">
                  {isPaying ? "Procesando..." : "Registrar Pago"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="p-8 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 font-black">
                    <History className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight text-base font-black">Cuentas por Pagar</h2>
                    <p className="text-sm text-slate-500 font-medium font-bold">Créditos de mercancía pendientes con proveedores.</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Total Deuda</p>
                    <p className="text-xl font-black text-indigo-600">{formatCurrency(totalDeuda)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-slate-200">
          {loading ? (
            <div className="p-20 text-center text-slate-400 font-black animate-pulse">Cargando cuentas...</div>
          ) : (
            <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8">Proveedor</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Factura</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha Ingreso</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Vencimiento</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Estado</TableHead>
                        <TableHead className="text-right font-black text-slate-400 uppercase text-[10px] tracking-widest pr-8">Total Pendiente</TableHead>
                        <TableHead className="text-center font-black text-slate-400 uppercase text-[10px] tracking-widest pr-4">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deudas.map((d) => {
                        const due = getDueDate(d.fecha, d.dias_credito);
                        const overdue = isOverdue(d.fecha, d.dias_credito);
                        return (
                            <TableRow key={d.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                <TableCell className="pl-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-slate-300" />
                                        <span className="font-black text-slate-800 text-sm tracking-tight">{d.proveedor}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">{d.numero_factura}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(d.fecha).toLocaleDateString()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className={cn(
                                        "flex items-center gap-2 text-xs font-black",
                                        overdue ? "text-rose-600" : "text-amber-600"
                                    )}>
                                        <Clock className="w-3.5 h-3.5" />
                                        {due.toLocaleDateString()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        overdue ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                    )}>
                                        {overdue ? "Vencida" : "Por Pagar"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <span className="font-black text-slate-900 text-base">{formatCurrency(d.total)}</span>
                                </TableCell>
                                <TableCell className="text-center pr-4">
                                    <Button size="sm" onClick={() => setPaymentModal({isOpen: true, deuda: d})} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg">Pagar</Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {deudas.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-32 bg-slate-50/10">
                                <div className="flex flex-col items-center gap-4 opacity-50">
                                    <CheckCircle2 className="w-16 h-16 text-emerald-300" />
                                    <p className="text-slate-400 font-bold italic">No tienes cuentas por pagar pendientes.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          )}
      </div>
    </div>
  );
}
