"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package, Search, AlertTriangle, TrendingDown, TrendingUp,
  CheckCircle2, ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Producto = {
  id: string;
  nombre: string;
  sku: string | null;
  stock_actual: number;
  stock_minimo: number;
  precio_venta: number;
  precio_compra: number;
};

type Mov = {
  tipo: string;
  cantidad: number;
  motivo: string | null;
  fecha: string;
  productos?: { nombre: string } | null;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

export default function ReporteInventarioPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    if (tenant) fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, movRes] = await Promise.all([
      supabase
        .from("productos")
        .select("id,nombre,sku,stock_actual,stock_minimo,precio_venta,precio_compra")
        .eq("tenant_id", tenant!.id)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("inventario_movimientos")
        .select("tipo,cantidad,motivo,fecha,productos:producto_id(nombre)")
        .eq("tenant_id", tenant!.id)
        .order("fecha", { ascending: false })
        .limit(50),
    ]);
    if (prodRes.data) setProductos(prodRes.data as any);
    if (movRes.data) setMovimientos(movRes.data as any);
    setLoading(false);
  };

  const filtered = productos.filter((p) => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase());
    if (filter === "out") return matchSearch && p.stock_actual === 0;
    if (filter === "low") return matchSearch && p.stock_actual > 0 && p.stock_actual <= p.stock_minimo;
    return matchSearch;
  });

  const totalCosto = productos.reduce((a, p) => a + p.precio_compra * p.stock_actual, 0);
  const totalVenta = productos.reduce((a, p) => a + p.precio_venta * p.stock_actual, 0);
  const agotados = productos.filter((p) => p.stock_actual === 0).length;
  const bajos = productos.filter((p) => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length;

  const stockStatus = (p: Producto) => {
    if (p.stock_actual === 0) return { label: "Agotado", color: "bg-rose-50 text-rose-600 border-rose-100" };
    if (p.stock_actual <= p.stock_minimo) return { label: "Bajo", color: "bg-amber-50 text-amber-600 border-amber-100" };
    return { label: "OK", color: "bg-emerald-50 text-emerald-600 border-emerald-100" };
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Package className="w-8 h-8 text-violet-600" /> Reporte de Inventario
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Stock actual, valorización y últimos movimientos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Productos", val: productos.length, icon: Package, color: "violet" },
          { label: "Valor Costo", val: fmt(totalCosto), icon: TrendingDown, color: "sky" },
          { label: "Valor Venta", val: fmt(totalVenta), icon: TrendingUp, color: "emerald" },
          { label: "Alertas Críticas", val: agotados + bajos, icon: AlertTriangle, color: "rose" },
        ].map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
              <k.icon className={cn("w-4 h-4", `text-${k.color}-500`)} />
            </div>
            <p className="text-xl font-black text-slate-800 truncate">{k.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Product Table */}
        <div className="xl:col-span-2 bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10 h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm"
                placeholder="Buscar producto o SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(["all", "low", "out"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                    filter === f
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {f === "all" ? "Todos" : f === "low" ? "⚠ Bajos" : "🔴 Agotados"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="p-16 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="pl-8 font-black text-[10px] text-slate-400 uppercase tracking-widest h-12">Producto</TableHead>
                    <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-12 text-center">Stock</TableHead>
                    <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-12 text-center">Estado</TableHead>
                    <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-12 text-right pr-8">Valor Inventario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const st = stockStatus(p);
                    return (
                      <TableRow key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 group">
                        <TableCell className="pl-8 py-4">
                          <p className="font-black text-slate-800 text-sm">{p.nombre}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.sku || "S/N"}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-black text-lg text-slate-700">{p.stock_actual}</span>
                          <span className="text-[9px] text-slate-400 font-bold ml-1">/ mín {p.stock_minimo}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("rounded-lg font-black text-[9px] uppercase tracking-wider border py-1 px-2.5", st.color)}>
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <p className="font-black text-slate-800">{fmt(p.precio_venta * p.stock_actual)}</p>
                          <p className="text-[9px] text-slate-400 font-bold">Costo: {fmt(p.precio_compra * p.stock_actual)}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Últimos Movimientos</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Ingresos, ventas y ajustes recientes</p>
          </div>
          <div className="overflow-auto flex-1 p-4 space-y-2">
            {movimientos.length === 0 ? (
              <div className="py-12 text-center opacity-30">
                <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-xs font-black text-slate-400 italic">Sin movimientos</p>
              </div>
            ) : movimientos.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  m.tipo === "venta" ? "bg-rose-50 text-rose-500" :
                  m.tipo === "ingreso" ? "bg-emerald-50 text-emerald-500" :
                  "bg-amber-50 text-amber-500"
                )}>
                  {m.tipo === "venta" ? <ArrowDownCircle className="w-5 h-5" /> :
                   m.tipo === "ingreso" ? <ArrowUpCircle className="w-5 h-5" /> :
                   <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-700 truncate">
                    {(m as any).productos?.nombre || "Producto"}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{m.motivo || m.tipo}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("font-black text-sm", m.tipo === "venta" ? "text-rose-500" : "text-emerald-600")}>
                    {m.tipo === "venta" ? "-" : "+"}{m.cantidad}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold">
                    {new Date(m.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
