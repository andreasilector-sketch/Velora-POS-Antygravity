"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  ChevronDown,
  Calculator,
  Briefcase
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, cn } from "@/lib/utils";

export default function CashFlowPage() {
  const { tenant } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ingresos: 0,
    costos_mercancia: 0,
    gastos_operativos: 0,
    utilidad_bruta: 0,
    utilidad_neta: 0
  });

  const supabase = createClient();

  useEffect(() => {
    if (tenant) {
      calculateFlow();
    }
  }, [tenant]);

  const calculateFlow = async () => {
    setLoading(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    // 1. Incomes (Ventas)
    const { data: ventas } = await (supabase
      .from("ventas")
      .select("total")
      .eq("tenant_id", tenant?.id as string)
      .eq("estado", "completada")
      .gte("fecha", startOfMonth.toISOString()));

    const totalIngresos = (ventas || []).reduce((acc: number, v: any) => acc + Number(v.total), 0);

    // 2. Costs (Ingresos Inventario) - Mercancía Comprada
    const { data: compras } = await (supabase
        .from("ingresos_inventario" as any) as any)
        .select("total")
        .eq("tenant_id", tenant?.id as string)
        .gte("fecha", startOfMonth.toISOString());
    
    const totalCostos = (compras || []).reduce((acc: number, c: any) => acc + Number(c.total), 0);

    // 3. Expenses (Gastos) - Arriendo, Nómina, etc.
    const { data: gastos } = await (supabase
        .from("gastos" as any) as any)
        .select("monto")
        .eq("tenant_id", tenant?.id as string)
        .gte("fecha", startOfMonth.toISOString());

    const totalGastos = (gastos || []).reduce((acc: number, g: any) => acc + Number(g.monto), 0);

    setStats({
        ingresos: totalIngresos,
        costos_mercancia: totalCostos,
        gastos_operativos: totalGastos,
        utilidad_bruta: totalIngresos - totalCostos,
        utilidad_neta: totalIngresos - (totalCostos + totalGastos)
    });

    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden font-sans">
      
      {/* Header */}
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                    <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Análisis de Flujo de Efectivo</h2>
                    <p className="text-sm text-slate-500 font-medium">Resumen financiero mensual: Ingresos vs Egresos</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="font-black text-xs text-slate-600 uppercase tracking-widest">Mes Actual</span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {loading ? (
            <div className="p-20 text-center animate-pulse">Calculando balance real...</div>
        ) : (
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Cartas de Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <ArrowUpCircle className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">+ VENTAS</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingresos Totales</p>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(stats.ingresos)}</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">- COMPRAS</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inversión Mercancía</p>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(stats.costos_mercancia)}</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <ArrowDownCircle className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">- GASTOS</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gastos Operativos</p>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(stats.gastos_operativos)}</p>
                    </div>

                    <div className={cn(
                        "p-6 rounded-3xl border shadow-lg flex flex-col gap-3 transition-transform hover:-translate-y-1",
                        stats.utilidad_neta >= 0 ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-white/20 text-white rounded-xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full text-white">UTILIDAD</span>
                        </div>
                        <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Ganancia Neta</p>
                        <p className="text-2xl font-black">{formatCurrency(stats.utilidad_neta)}</p>
                    </div>
                </div>

                {/* Gráfico Visual Simple o Tabla Detallada */}
                <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 tracking-tight">
                        <Calculator className="w-6 h-6 text-emerald-600" />
                        Desglose Financiero
                    </h3>

                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-2xl flex items-center justify-between border border-slate-100">
                           <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                   <TrendingUp className="w-5 h-5" />
                               </div>
                               <span className="font-bold text-slate-600">Total Ingresos Operativos</span>
                           </div>
                           <span className="font-black text-emerald-600 text-lg">{formatCurrency(stats.ingresos)}</span>
                        </div>

                        <div className="bg-white p-6 rounded-2xl flex items-center justify-between border border-slate-100">
                           <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                   <Briefcase className="w-5 h-5" />
                               </div>
                               <span className="font-bold text-slate-600">Costo de Mercancía (Inventario)</span>
                           </div>
                           <span className="font-black text-indigo-600 text-lg">({formatCurrency(stats.costos_mercancia)})</span>
                        </div>

                        <div className="h-px bg-slate-200 mx-4" />

                        <div className="bg-white p-6 rounded-2xl flex items-center justify-between border border-slate-100">
                           <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-black">
                                   =
                               </div>
                               <span className="font-black text-slate-700 uppercase text-xs tracking-widest">Margen Bruto</span>
                           </div>
                           <span className="font-black text-slate-800 text-xl">{formatCurrency(stats.utilidad_bruta)}</span>
                        </div>

                        <div className="bg-white p-6 rounded-2xl flex items-center justify-between border border-slate-100">
                           <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                                   <TrendingDown className="w-5 h-5" />
                               </div>
                               <span className="font-bold text-slate-600">Gastos Operativos (Nómina, Arriendo, Servicios)</span>
                           </div>
                           <span className="font-black text-rose-600 text-lg">({formatCurrency(stats.gastos_operativos)})</span>
                        </div>

                        <div className={cn(
                            "p-8 rounded-3xl flex items-center justify-between border-2 mt-8 shadow-xl",
                            stats.utilidad_neta >= 0 ? "bg-emerald-50 border-emerald-500" : "bg-rose-50 border-rose-500"
                        )}>
                           <div className="flex flex-col gap-1">
                               <span className={cn("text-xs font-black uppercase tracking-widest", stats.utilidad_neta >= 0 ? "text-emerald-600" : "text-rose-600")}>Utilidad Neta Real</span>
                               <span className="text-slate-500 text-[10px] font-bold">Saldo disponible tras costos y gastos</span>
                           </div>
                           <span className={cn("text-4xl font-black tracking-tighter", stats.utilidad_neta >= 0 ? "text-emerald-700" : "text-rose-700")}>{formatCurrency(stats.utilidad_neta)}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
