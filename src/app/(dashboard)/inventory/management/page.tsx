"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, normalizeText } from "@/lib/utils";
import { Search, Package, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

type Producto = {
  id: string;
  nombre: string;
  sku: string | null;
  stock_actual: number;
  stock_minimo: number;
  precio_venta: number;
  precio_compra: number;
  activo: boolean;
  categorias?: { nombre: string } | null;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

type FiltroStock = "todos" | "ok" | "bajo" | "agotado";

export default function GestionItemsPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStock, setFiltroStock] = useState<FiltroStock>("todos");

  useEffect(() => {
    if (tenant) fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("productos")
      .select("id,nombre,sku,stock_actual,stock_minimo,precio_venta,precio_compra,activo,categorias(nombre)")
      .eq("tenant_id", tenant!.id)
      .order("nombre");
    if (data) setProductos(data as unknown as Producto[]);
    setLoading(false);
  };

  const getStockStatus = (p: Producto): "agotado" | "bajo" | "ok" => {
    if (p.stock_actual === 0) return "agotado";
    if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo) return "bajo";
    return "ok";
  };

  const filtered = productos.filter((p) => {
    const s = normalizeText(search);
    const matchSearch =
      normalizeText(p.nombre).includes(s) ||
      normalizeText(p.sku || "").includes(s);
    const status = getStockStatus(p);
    if (filtroStock !== "todos" && status !== filtroStock) return false;
    return matchSearch;
  });

  const counts = {
    ok: productos.filter((p) => getStockStatus(p) === "ok").length,
    bajo: productos.filter((p) => getStockStatus(p) === "bajo").length,
    agotado: productos.filter((p) => getStockStatus(p) === "agotado").length,
  };

  const STATUS_CONFIG = {
    ok:      { label: "Stock OK",    color: "emerald", icon: CheckCircle },
    bajo:    { label: "Stock Bajo",  color: "amber",   icon: AlertTriangle },
    agotado: { label: "Agotado",     color: "rose",    icon: XCircle },
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Gestión de Ítems</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Vista avanzada de todos tus productos con alertas de stock
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline" className="h-10 rounded-xl font-black border-slate-200 text-slate-600 flex gap-2">
            <Package className="w-4 h-4" /> Ir a Catálogo
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["ok", "bajo", "agotado"] as const).map((key) => {
          const cfg = STATUS_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFiltroStock(filtroStock === key ? "todos" : key)}
              className={cn(
                "bg-white rounded-2xl border-2 p-4 text-left shadow-sm transition-all hover:shadow-md",
                filtroStock === key
                  ? `border-${cfg.color}-300 bg-${cfg.color}-50`
                  : "border-slate-100"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cfg.label}</p>
                <Icon className={cn("w-4 h-4", `text-${cfg.color}-500`)} />
              </div>
              <p className={cn("text-3xl font-black", `text-${cfg.color}-600`)}>{counts[key]}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              className="pl-9 h-10 border-slate-200 rounded-xl"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filtroStock !== "todos" && (
            <button
              onClick={() => setFiltroStock("todos")}
              className="px-4 py-2 text-xs font-black uppercase rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
            >
              ✕ Quitar filtro
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-black text-xs uppercase animate-pulse">
              Cargando ítems...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400 text-sm">
                {search ? "Sin resultados para tu búsqueda" : "No hay productos en esta categoría"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="pl-6 font-black text-xs text-slate-500 uppercase">Producto</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase">Categoría</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-center">Stock Actual</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-center">Estado</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right">Costo</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right pr-6">PVP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const status = getStockStatus(p);
                  const statusColor = status === "ok" ? "emerald" : status === "bajo" ? "amber" : "rose";
                  return (
                    <TableRow key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-3">
                        <p className="font-black text-slate-800">{p.nombre}</p>
                        {p.sku && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.sku}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {p.categorias?.nombre || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-black text-xl", `text-${statusColor}-600`)}>
                          {p.stock_actual}
                        </span>
                        {p.stock_minimo > 0 && (
                          <span className="text-[9px] text-slate-400 block">mín: {p.stock_minimo}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase px-2.5 py-1 rounded-full",
                            status === "ok"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "bajo"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {status === "ok" ? "✓ OK" : status === "bajo" ? "⚠ Bajo" : "✕ Agotado"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-600 text-sm">
                        {formatCurrency(p.precio_compra)}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black text-emerald-700">
                        {formatCurrency(p.precio_venta)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer count */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
            {filtered.length} de {productos.length} productos
          </p>
        </div>
      </div>
    </div>
  );
}
