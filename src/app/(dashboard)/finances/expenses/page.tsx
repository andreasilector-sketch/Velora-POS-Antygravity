"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowDownCircle, 
  Plus, 
  Trash2, 
  Save,
  Calendar,
  Receipt,
  FileText,
  DollarSign
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, cn } from "@/lib/utils";

const CATEGORIAS = [
  "Arriendo",
  "Nómina",
  "Servicios Públicos",
  "Pagos de Créditos",
  "Mantenimiento",
  "Proveedores",
  "Suministros",
  "Otros"
];

const METODOS = [
  { id: "efectivo", name: "Efectivo (Caja)" },
  { id: "transferencia", name: "Transferencia Bancaria" },
  { id: "consignacion", name: "Consignación" },
  { id: "tarjeta", name: "Tarjeta Débito/Crédito" }
];

export default function ExpensesPage() {
  const { tenant, profile } = useUserProfile();
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();

  // New Expense State
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState(0);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenant) {
      fetchGastos();
    }
  }, [tenant]);

  const fetchGastos = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("gastos" as any) as any)
      .select("*")
      .eq("tenant_id", tenant?.id)
      .order("fecha", { ascending: false });

    if (data) setGastos(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) return alert("El monto debe ser mayor a 0.");
    setIsSubmitting(true);

    try {
      const { error } = await (supabase
        .from("gastos" as any) as any)
        .insert({
          tenant_id: tenant?.id,
          categoria,
          descripcion,
          monto,
          metodo_pago: metodoPago,
          fecha: new Date(fecha).toISOString()
        });

      if (error) throw error;

      if (metodoPago === "efectivo" && profile?.id) {
        const { data: session } = await (supabase.from("sesiones_caja" as any) as any)
          .select("id")
          .eq("usuario_id", profile.id)
          .eq("estado", "abierta")
          .maybeSingle();

        if (session) {
          await (supabase.from("caja_movimientos" as any) as any).insert({
            sesion_id: session.id,
            tipo: "egreso",
            monto: monto,
            metodo_pago: "efectivo",
            descripcion: `Gasto: ${categoria} - ${descripcion}`
          });
        }
      }

      setIsDialogOpen(false);
      setDescripcion("");
      setMonto(0);
      setFecha(new Date().toISOString().split('T')[0]);
      fetchGastos();
      
      alert("Gasto registrado correctamente.");
    } catch (error: any) {
      alert("Error al registrar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGasto = async (id: string) => {
    if (!confirm("¿Eliminar este registro de gasto?")) return;
    const { error } = await (supabase.from("gastos" as any) as any).delete().eq("id", id);
    if (!error) fetchGastos();
  };

  const totalMensual = gastos.reduce((acc, g) => {
    const gDate = new Date(g.fecha);
    const now = new Date();
    if(gDate.getMonth() === now.getMonth() && gDate.getFullYear() === now.getFullYear()) {
        return acc + Number(g.monto);
    }
    return acc;
  }, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden font-sans">
      
      {/* Modal Nuevo Gasto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[450px] p-0 overflow-hidden bg-white border-none rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                    <ArrowDownCircle className="w-5 h-5" />
                  </div>
                  Registrar Gasto Operativo
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</Label>
                <select 
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                >
                   {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</Label>
                <Input 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)} 
                  className="h-11 border-slate-200 bg-slate-50/50 rounded-xl font-medium" 
                  placeholder="Detalle..." 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                    <Input 
                      type="number"
                      value={monto || ""} 
                      onChange={e => setMonto(Number(e.target.value))} 
                      className="h-11 pl-7 border-slate-200 bg-slate-50/50 rounded-xl font-black text-rose-600" 
                      placeholder="0" 
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</Label>
                  <Input 
                    type="date"
                    value={fecha} 
                    onChange={e => setFecha(e.target.value)} 
                    className="h-11 border-slate-200 bg-slate-50/50 rounded-xl font-bold text-slate-700" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pago con:</Label>
                <select 
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                >
                   {METODOS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl font-bold py-6">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black py-6">
                <Save className="w-4 h-4 mr-2" /> Guardar Gasto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="p-8 pb-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-100">
                    <ArrowDownCircle className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gastos Operativos</h2>
                    <p className="text-sm text-slate-500 font-medium">Registro de egresos: Nómina, recibos, arriendos y más.</p>
                </div>
            </div>

            <Button 
                onClick={() => setIsDialogOpen(true)}
                className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black shadow-lg shadow-rose-100 transition-all hover:-translate-y-0.5 rounded-xl"
            >
                <Plus className="w-5 h-5 mr-2" /> Nuevo Gasto
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-rose-200 transition-colors">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Gastos (Mes)</p>
                    <p className="text-xl font-black text-rose-600">{formatCurrency(totalMensual)}</p>
                </div>
            </div>
            {/* Espacios para otros widgets */}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-slate-200">
          {loading ? (
            <div className="p-20 text-center text-slate-400 font-bold italic animate-pulse">Cargando registros...</div>
          ) : (
            <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8">Fecha</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Categoría</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Descripción</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Medio</TableHead>
                        <TableHead className="text-right font-black text-slate-400 uppercase text-[10px] tracking-widest pr-8">Monto</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {gastos.map((g) => (
                        <TableRow key={g.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
                            <TableCell className="pl-8 py-5">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-sm">{new Date(g.fecha).toLocaleDateString()}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                    g.categoria === "Nómina" ? "bg-indigo-50 text-indigo-700" :
                                    g.categoria === "Arriendo" ? "bg-amber-50 text-amber-700" :
                                    "bg-slate-100 text-slate-600"
                                )}>
                                    {g.categoria}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{g.descripcion}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{g.metodo_pago}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <span className="font-black text-rose-600 text-base">{formatCurrency(g.monto)}</span>
                            </TableCell>
                            <TableCell className="pr-4">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => deleteGasto(g.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-all rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {gastos.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-32 bg-slate-50/10">
                                <div className="flex flex-col items-center gap-4 opacity-50">
                                    <ArrowDownCircle className="w-16 h-16 text-slate-200" />
                                    <p className="text-slate-400 font-bold italic">No hay gastos registrados.</p>
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
