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

export default function AccountsPayablePage() {
  const { tenant } = useUserProfile();
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
