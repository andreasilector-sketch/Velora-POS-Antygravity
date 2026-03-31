"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, DollarSign, Search } from "lucide-react";

type ListaPrecio = { id: string; nombre: string; factor: number; descripcion: string | null; activo: boolean; created_at: string; };

const formatCurrency = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

export default function ListasPreciosPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [listas, setListas] = useState<ListaPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<ListaPrecio | null>(null);
  const [form, setForm] = useState({ nombre: "", factor: "1", descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [samplePrice] = useState(50000);

  useEffect(() => { if (tenant) fetchData(); }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    // Use categorias as a proxy; in a real implementation, you would have a listas_precios table
    // For now, we show a placeholder UI with sample data
    setListas([
      { id: "1", nombre: "Precio Público", factor: 1.0, descripcion: "Precio final para clientes regulares", activo: true, created_at: new Date().toISOString() },
      { id: "2", nombre: "Precio Mayorista", factor: 0.85, descripcion: "15% de descuento para clientes mayoristas", activo: true, created_at: new Date().toISOString() },
      { id: "3", nombre: "Precio VIP", factor: 0.9, descripcion: "10% de descuento para clientes VIP", activo: true, created_at: new Date().toISOString() },
    ]);
    setLoading(false);
  };

  const openNew = () => { setSelected(null); setForm({ nombre: "", factor: "1", descripcion: "" }); setIsOpen(true); };
  const openEdit = (l: ListaPrecio) => { setSelected(l); setForm({ nombre: l.nombre, factor: String(l.factor), descripcion: l.descripcion || "" }); setIsOpen(true); };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Listas de Precios</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Define precios diferenciados por segmento de cliente</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-100 flex gap-2">
          <Plus className="w-4 h-4" /> Nueva Lista
        </Button>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-sm text-sky-800 font-medium flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
        <p>Las listas de precios se aplican automáticamente según el <strong>tipo de cliente</strong> (Normal, Mayorista, VIP). El factor multiplica el precio base del producto.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {listas.map(lista => (
          <div key={lista.id} className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => openEdit(lista)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="font-black text-slate-800 text-base">{lista.nombre}</p>
            {lista.descripcion && <p className="text-xs text-slate-500 mt-1">{lista.descripcion}</p>}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Factor</span>
                <span className="font-black text-slate-700">×{lista.factor}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Ej: $50.000 →</span>
                <span className="font-black text-emerald-700">{formatCurrency(samplePrice * lista.factor)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
