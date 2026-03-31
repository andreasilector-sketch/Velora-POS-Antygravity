"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Search, DollarSign, TrendingUp, Package, AlertTriangle } from "lucide-react";

type ProductoValor = {
  id: string; nombre: string; sku: string | null; 
  stock_actual: number; precio_compra: number; precio_venta: number; stock_minimo: number;
  categoria_id: string | null;
};

const formatCurrency = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

export default function ValorInventarioPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [productos, setProductos] = useState<ProductoValor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "bajo_stock" | "sin_stock">("todos");

  useEffect(() => { if (tenant) fetchData(); }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("productos")
      .select("id,nombre,sku,stock_actual,precio_compra,precio_venta,stock_minimo,categoria_id")
      .eq("tenant_id", tenant!.id)
      .eq("activo", true)
      .order("nombre");
    if (data) setProductos(data);
    setLoading(false);
  };

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
    if (filtro === "bajo_stock") return matchSearch && p.stock_actual > 0 && p.stock_actual <= p.stock_minimo;
    if (filtro === "sin_stock") return matchSearch && p.stock_actual === 0;
    return matchSearch;
  });

  const totalCosto = productos.reduce((acc, p) => acc + (p.stock_actual * p.precio_compra), 0);
  const totalVenta = productos.reduce((acc, p) => acc + (p.stock_actual * p.precio_venta), 0);
  const gananciaLatente = totalVenta - totalCosto;

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Valor de Inventario</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Resumen del valor actual de tu stock</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor a Costo</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(totalCosto)}</p>
          <p className="text-[10px] text-slate-500 mt-2 uppercase">Lo que invertiste</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-5 shadow-xl shadow-emerald-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Valor a Precio de Venta</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(totalVenta)}</p>
          <p className="text-[10px] text-emerald-200 mt-2 uppercase">Si vendieras todo hoy</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-2xl p-5 shadow-xl shadow-violet-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">Ganancia Latente</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(gananciaLatente)}</p>
          <p className="text-[10px] text-violet-200 mt-2 uppercase">Utilidad potencial</p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input className="pl-9 h-10 border-slate-200 rounded-xl" placeholder="Buscar producto o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(["todos", "bajo_stock", "sin_stock"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                  filtro === f ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}>
                {f === "todos" ? "Todos" : f === "bajo_stock" ? "⚠ Bajo Stock" : "❌ Sin Stock"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-black text-xs uppercase animate-pulse">Calculando valor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="pl-6 font-black text-xs text-slate-500 uppercase">Producto</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-center">Stock</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right">Costo Unit.</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right">PVP Unit.</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right">Valor Costo</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right pr-6">Valor PVP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const valorCosto = p.stock_actual * p.precio_compra;
                  const valorVenta = p.stock_actual * p.precio_venta;
                  const esBajoStock = p.stock_actual <= p.stock_minimo && p.stock_minimo > 0;
                  const esSinStock = p.stock_actual === 0;
                  return (
                    <TableRow key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          {(esSinStock || esBajoStock) && <AlertTriangle className={cn("w-4 h-4", esSinStock ? "text-rose-400" : "text-amber-400")} />}
                          <div>
                            <p className="font-black text-slate-800">{p.nombre}</p>
                            {p.sku && <p className="text-[10px] text-slate-400 font-bold uppercase">{p.sku}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-black text-lg px-3 py-1 rounded-lg", 
                          esSinStock ? "bg-rose-50 text-rose-600" : esBajoStock ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700"
                        )}>{p.stock_actual}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-600">{formatCurrency(p.precio_compra)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(p.precio_venta)}</TableCell>
                      <TableCell className="text-right font-black text-slate-700">{formatCurrency(valorCosto)}</TableCell>
                      <TableCell className="text-right pr-6 font-black text-emerald-700">{formatCurrency(valorVenta)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <p className="text-xs font-black text-slate-400 uppercase">{filtered.length} productos</p>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total a Costo</p>
              <p className="font-black text-slate-800">{formatCurrency(filtered.reduce((a, p) => a + p.stock_actual * p.precio_compra, 0))}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total PVP</p>
              <p className="font-black text-emerald-700">{formatCurrency(filtered.reduce((a, p) => a + p.stock_actual * p.precio_venta, 0))}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
