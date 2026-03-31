"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { 
  Plus, ArrowUpCircle, ArrowDownCircle, RefreshCw, Package, 
  Search, AlertTriangle, TrendingUp, TrendingDown
} from "lucide-react";

type Producto = { id: string; nombre: string; sku: string | null; stock_actual: number; stock_minimo: number; };
type Movimiento = { 
  id: string; tipo: string; cantidad: number; motivo: string | null; 
  fecha: string; referencia: string | null; costo_unitario: number;
  productos?: { nombre: string; sku: string | null } | null;
};

const TIPO_CONFIG = {
  ingreso:    { label: "Ingreso de Compra", icon: ArrowUpCircle,   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  ajuste:     { label: "Ajuste Manual",     icon: RefreshCw,       color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  devolucion: { label: "Devolución",        icon: ArrowUpCircle,   color: "text-sky-600",     bg: "bg-sky-50 border-sky-200" },
  venta:      { label: "Venta",             icon: ArrowDownCircle, color: "text-rose-600",    bg: "bg-rose-50 border-rose-200" },
};

const formatCurrency = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

export default function AjustesInventarioPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ producto_id: "", tipo: "ingreso", cantidad: "", motivo: "", costo_unitario: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (tenant) { fetchData(); } }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, movRes] = await Promise.all([
      supabase.from("productos").select("id,nombre,sku,stock_actual,stock_minimo").eq("tenant_id", tenant!.id).eq("activo", true).order("nombre"),
      supabase.from("inventario_movimientos").select("id,tipo,cantidad,motivo,fecha,referencia,costo_unitario,productos(nombre,sku)").eq("tenant_id", tenant!.id).order("fecha", { ascending: false }).limit(100),
    ]);
    if (prodRes.data) setProductos(prodRes.data);
    if (movRes.data) setMovimientos(movRes.data as unknown as Movimiento[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.producto_id || !form.cantidad || !tenant) return;
    setSaving(true); setError(null);
    
    const cantidad = parseInt(form.cantidad);
    const tipoFinal = form.tipo;
    const cantidadDelta = ["ingreso", "devolucion"].includes(tipoFinal) ? cantidad : -cantidad;
    
    const sucursalRes = await supabase.from("sucursales").select("id").eq("tenant_id", tenant.id).limit(1).single();
    const sucursalId = sucursalRes.data?.id;
    if (!sucursalId) { setError("No se encontró una sucursal activa."); setSaving(false); return; }

    const { error: movErr } = await supabase.from("inventario_movimientos").insert({
      producto_id: form.producto_id,
      tenant_id: tenant.id,
      tipo: tipoFinal,
      cantidad: Math.abs(cantidad),
      motivo: form.motivo || null,
      costo_unitario: parseFloat(form.costo_unitario) || 0,
      sucursal_id: sucursalId,
    } as any);

    if (movErr) { setError(movErr.message); setSaving(false); return; }

    // Update stock on producto
    const prod = productos.find(p => p.id === form.producto_id);
    if (prod) {
      const newStock = ["ingreso", "devolucion"].includes(tipoFinal)
        ? prod.stock_actual + cantidad
        : prod.stock_actual + cantidadDelta;
      await supabase.from("productos").update({ stock_actual: Math.max(0, newStock) }).eq("id", form.producto_id);
    }

    setSaving(false);
    setIsDialogOpen(false);
    setForm({ producto_id: "", tipo: "ingreso", cantidad: "", motivo: "", costo_unitario: "" });
    fetchData();
  };

  const filteredMov = movimientos.filter(m => 
    m.productos?.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (m.referencia || "").toLowerCase().includes(search.toLowerCase())
  );

  const stockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo && p.stock_minimo > 0);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Ajustes de Inventario</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Registra entradas, salidas y correcciones de stock</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-100 flex gap-2">
          <Plus className="w-4 h-4" /> Nuevo Ajuste
        </Button>
      </div>

      {/* Alertas de Stock Bajo */}
      {stockBajo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-amber-800 text-sm">⚠️ {stockBajo.length} producto(s) con stock mínimo alcanzado</p>
            <p className="text-xs text-amber-600 mt-1">{stockBajo.map(p => p.nombre).join(", ")}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Productos", value: productos.length, icon: Package, color: "emerald" },
          { label: "Stock Bajo", value: stockBajo.length, icon: AlertTriangle, color: "amber" },
          { label: "Ingresos Hoy", value: movimientos.filter(m => m.tipo === "ingreso" && new Date(m.fecha).toDateString() === new Date().toDateString()).length, icon: TrendingUp, color: "sky" },
          { label: "Mov. Totales", value: movimientos.length, icon: RefreshCw, color: "violet" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
            <p className={`text-3xl font-black mt-1 text-${kpi.color}-600`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input className="pl-9 h-10 border-slate-200 rounded-xl" placeholder="Buscar movimiento o producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Cargando movimientos...</div>
          ) : filteredMov.length === 0 ? (
            <div className="p-16 text-center">
              <RefreshCw className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400 text-sm">Sin movimientos registrados</p>
              <p className="text-xs text-slate-300 mt-1">Usa "Nuevo Ajuste" para registrar tu primer movimiento</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="pl-6 font-black text-xs text-slate-500 uppercase">Producto</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-center">Tipo</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-center">Cantidad</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase">Motivo</TableHead>
                  <TableHead className="font-black text-xs text-slate-500 uppercase text-right pr-6">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMov.map(mov => {
                  const cfg = TIPO_CONFIG[mov.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.ajuste;
                  const Icon = cfg.icon;
                  const isPositive = ["ingreso", "devolucion"].includes(mov.tipo);
                  return (
                    <TableRow key={mov.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-4">
                        <p className="font-black text-slate-800">{mov.productos?.nombre || "Producto eliminado"}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{mov.productos?.sku || ""}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border", cfg.bg, cfg.color)}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-black text-lg", isPositive ? "text-emerald-600" : "text-rose-600")}>
                          {isPositive ? "+" : "-"}{mov.cantidad}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 font-medium">{mov.motivo || "—"}</TableCell>
                      <TableCell className="text-right pr-6 text-xs text-slate-400 font-bold">
                        {new Date(mov.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Dialog Nuevo Ajuste */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-emerald-50 to-white border-b border-slate-100">
            <DialogTitle className="font-black text-slate-800 text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" /> Registrar Movimiento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Ingreso, salida o ajuste de stock</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-bold">{error}</div>}
            
            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Tipo de Movimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["ingreso", "ajuste", "devolucion"] as const).map(tipo => {
                  const cfg = TIPO_CONFIG[tipo];
                  const Icon = cfg.icon;
                  return (
                    <button key={tipo} onClick={() => setForm(f => ({ ...f, tipo }))}
                      className={cn("p-3 rounded-xl border-2 text-xs font-black flex flex-col items-center gap-1 transition-all",
                        form.tipo === tipo ? `${cfg.bg} ${cfg.color}` : "border-slate-100 text-slate-400 hover:border-slate-200"
                      )}>
                      <Icon className="w-5 h-5" /> {cfg.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Producto</Label>
              <Select value={form.producto_id} onValueChange={(v: string | null) => setForm(f => ({ ...f, producto_id: v ?? "" }))}>
                <SelectTrigger className="h-11 border-slate-200 rounded-xl font-bold text-slate-700">
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {productos.map(p => (
                    <SelectItem key={p.id} value={p.id} className="font-bold">
                      <span>{p.nombre}</span>
                      <span className="ml-2 text-xs text-slate-400">Stock: {p.stock_actual}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-slate-700 text-sm">Cantidad</Label>
                <Input type="number" inputMode="numeric" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" className="h-11 border-slate-200 rounded-xl font-bold text-xl text-center" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-slate-700 text-sm">Costo Unitario (opt)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                  <Input type="number" value={form.costo_unitario} onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))} placeholder="0" className="h-11 pl-7 border-slate-200 rounded-xl font-bold" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Motivo / Referencia</Label>
              <Input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Ej: Compra factura #001, Conteo físico..." className="h-11 border-slate-200 rounded-xl" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11 rounded-xl font-black border-slate-200">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.producto_id || !form.cantidad} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-100">
                {saving ? "Guardando..." : "Registrar Movimiento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
