"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  BarChart4, 
  TrendingUp, 
  TrendingDown, 
  PackageSearch,
  DollarSign,
  ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ItemStats {
  id: string;
  nombre: string;
  sku: string;
  cantidad_vendida: number;
  total_generado: number;
  costo_total: number;
  utilidad_neta: number;
  margen_promedio: number;
}

export default function ItemReportsPage() {
  const { tenant } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ItemStats[]>([]);
  const [sortField, setSortField] = useState<keyof ItemStats>("cantidad_vendida");
  const [sortAsc, setSortAsc] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (tenant) {
      fetchItemStats();
    }
  }, [tenant]);

  const fetchItemStats = async () => {
    setLoading(true);
    
    // 1. Obtener todas las ventas completadas
    const { data: ventas } = await (supabase.from("ventas" as any) as any)
      .select("id")
      .eq("tenant_id", tenant?.id)
      .eq("estado", "completada");

    if (!ventas || ventas.length === 0) {
      setStats([]);
      setLoading(false);
      return;
    }

    const ventaIds = ventas.map((v: any) => v.id);

    // 2. Obtener los ítems de esas ventas
    const { data: items } = await (supabase.from("venta_items" as any) as any)
      .select(`
        producto_id,
        cantidad,
        subtotal_final,
        productos (
          nombre,
          sku,
          precio_compra
        )
      `)
      .in("venta_id", ventaIds);

    if (!items) {
      setStats([]);
      setLoading(false);
      return;
    }

    // 3. Agrupar y calcular estadísticas
    const map = new Map<string, ItemStats>();

    items.forEach((item: any) => {
      if (!item.productos) return; // Puede ser un item custom, lo saltamos por ahora si no tiene producto
      const pId = item.producto_id;
      const prod = item.productos;
      const costoUni = Number(prod.precio_compra || 0);
      const qty = Number(item.cantidad || 0);
      const subtotal = Number(item.subtotal_final || 0);
      const costoTotal = costoUni * qty;

      if (map.has(pId)) {
        const existing = map.get(pId)!;
        existing.cantidad_vendida += qty;
        existing.total_generado += subtotal;
        existing.costo_total += costoTotal;
        existing.utilidad_neta = existing.total_generado - existing.costo_total;
        existing.margen_promedio = existing.costo_total > 0 ? (existing.utilidad_neta / existing.costo_total) * 100 : 100;
      } else {
        const util = subtotal - costoTotal;
        map.set(pId, {
          id: pId,
          nombre: prod.nombre,
          sku: prod.sku,
          cantidad_vendida: qty,
          total_generado: subtotal,
          costo_total: costoTotal,
          utilidad_neta: util,
          margen_promedio: costoTotal > 0 ? (util / costoTotal) * 100 : 100
        });
      }
    });

    const results = Array.from(map.values());
    results.sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
    setStats(results);
    setLoading(false);
  };

  const handleSort = (field: keyof ItemStats) => {
    const isAsc = sortField === field ? !sortAsc : false;
    setSortField(field);
    setSortAsc(isAsc);

    const sorted = [...stats].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return isAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });
    setStats(sorted);
  };

  const globalInfo = stats.reduce(
    (acc, curr) => {
      acc.total_qty += curr.cantidad_vendida;
      acc.total_rev += curr.total_generado;
      acc.total_cost += curr.costo_total;
      return acc;
    },
    { total_qty: 0, total_rev: 0, total_cost: 0 }
  );
  const globalMargin = globalInfo.total_cost > 0 
    ? ((globalInfo.total_rev - globalInfo.total_cost) / globalInfo.total_cost) * 100 
    : 100;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden font-sans">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
            <BarChart4 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Rendimiento por Producto</h2>
            <p className="text-sm text-slate-500 font-medium">Análisis de ventas, rentabilidad y rotación de ítems.</p>
          </div>
        </div>
        <div className="flex bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-xs font-black uppercase text-slate-500 tracking-widest text-center">Datos Históricos Consolidados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8 border-b border-slate-100 bg-white">
          <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex items-center justify-between">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Und. Vendidas</p>
                <p className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{globalInfo.total_qty.toLocaleString()}</p>
             </div>
             <PackageSearch className="w-8 h-8 opacity-20" />
          </div>
          <div className="p-5 border border-emerald-100 rounded-2xl bg-emerald-50 flex items-center justify-between">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ingresos Globales</p>
                <p className="text-2xl font-black text-emerald-700 tracking-tighter mt-1">{formatCurrency(globalInfo.total_rev)}</p>
             </div>
             <DollarSign className="w-8 h-8 text-emerald-600 opacity-20" />
          </div>
          <div className="p-5 border border-sky-100 rounded-2xl bg-sky-50 flex items-center justify-between">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Utilidad Global</p>
                <p className="text-2xl font-black text-sky-700 tracking-tighter mt-1">{formatCurrency(globalInfo.total_rev - globalInfo.total_cost)}</p>
             </div>
             <TrendingUp className="w-8 h-8 text-sky-600 opacity-20" />
          </div>
          <div className="p-5 border border-violet-100 rounded-2xl bg-violet-50 flex items-center justify-between">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Margen Promedio</p>
                <p className="text-2xl font-black text-violet-700 tracking-tighter mt-1">{globalMargin.toFixed(1)}%</p>
             </div>
             <BarChart4 className="w-8 h-8 text-violet-600 opacity-20" />
          </div>
      </div>

      <div className="flex-1 overflow-auto p-0">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-medium">Procesando millones de registros...</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-b border-slate-200">
                <TableHead className="pl-8 font-bold text-slate-500 uppercase text-[10px] tracking-widest min-w-[300px]">Producto</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('cantidad_vendida')} className="font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200/50 rounded-lg h-8 px-2">
                    <ArrowUpDown className="w-3 h-3 mr-1" /> Unds.
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                   <Button variant="ghost" onClick={() => handleSort('total_generado')} className="font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200/50 rounded-lg h-8 px-2">
                    <ArrowUpDown className="w-3 h-3 mr-1" /> Ventas brutas
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                   <Button variant="ghost" onClick={() => handleSort('utilidad_neta')} className="font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200/50 rounded-lg h-8 px-2">
                    <ArrowUpDown className="w-3 h-3 mr-1" /> Utilidad
                  </Button>
                </TableHead>
                <TableHead className="text-right pr-8">
                   <Button variant="ghost" onClick={() => handleSort('margen_promedio')} className="font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-200/50 rounded-lg h-8 px-2">
                    <ArrowUpDown className="w-3 h-3 mr-1" /> Margen %
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <TableCell className="pl-8 py-4">
                     <div>
                        <p className="font-black text-sm text-slate-800 tracking-tight leading-none mb-1">{s.nombre}</p>
                        <p className="font-mono text-[9px] text-slate-400">{s.sku || "SIN SKU"}</p>
                     </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn("text-sm font-black tracking-widest border-0 font-mono", s.cantidad_vendida > 0 ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-600")}>
                       {s.cantidad_vendida}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-700">
                     {formatCurrency(s.total_generado)}
                  </TableCell>
                  <TableCell className="text-right font-black text-emerald-600">
                     {formatCurrency(s.utilidad_neta)}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                     <div className="flex items-center justify-end gap-2">
                        {s.margen_promedio > 30 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
                        <span className={cn(
                           "font-black text-base tracking-tighter", 
                           s.margen_promedio > 30 ? "text-emerald-700" : "text-rose-600"
                        )}>
                           {s.margen_promedio.toFixed(1)}%
                        </span>
                     </div>
                  </TableCell>
                </TableRow>
              ))}
              {stats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-32 bg-slate-50/10">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <BarChart4 className="w-16 h-16 text-slate-300" />
                      <p className="text-slate-500 font-bold italic">No hay historial de ventas suficiente todavía.</p>
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
