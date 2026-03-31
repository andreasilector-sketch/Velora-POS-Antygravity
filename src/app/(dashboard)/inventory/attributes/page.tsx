"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Layers, Search } from "lucide-react";

type Atributo = { id: string; nombre: string; valores: string[]; };

const MOCK_ATRIBUTOS: Atributo[] = [
  { id: "1", nombre: "Presentación", valores: ["Cápsulas", "Comprimidos", "Líquido", "Polvo", "Crema", "Gel"] },
  { id: "2", nombre: "Contenido", valores: ["30 unidades", "60 unidades", "90 unidades", "120 ml", "250 ml", "500 ml"] },
  { id: "3", nombre: "Marca", valores: ["Nature's best", "Bioland", "Natural One", "Schum"] },
];

export default function AtributosPage() {
  const [atributos, setAtributos] = useState<Atributo[]>(MOCK_ATRIBUTOS);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", valores: "" });
  const [selected, setSelected] = useState<Atributo | null>(null);

  const openNew = () => { setSelected(null); setForm({ nombre: "", valores: "" }); setIsOpen(true); };
  const openEdit = (a: Atributo) => { setSelected(a); setForm({ nombre: a.nombre, valores: a.valores.join(", ") }); setIsOpen(true); };

  const handleSave = () => {
    if (!form.nombre.trim()) return;
    const vals = form.valores.split(",").map(v => v.trim()).filter(Boolean);
    if (selected) {
      setAtributos(prev => prev.map(a => a.id === selected.id ? { ...a, nombre: form.nombre, valores: vals } : a));
    } else {
      setAtributos(prev => [...prev, { id: Date.now().toString(), nombre: form.nombre, valores: vals }]);
    }
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este atributo?")) return;
    setAtributos(prev => prev.filter(a => a.id !== id));
  };

  const filtered = atributos.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Atributos</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Define características y variantes para tus productos (presentación, tamaño, etc)</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-100 flex gap-2">
          <Plus className="w-4 h-4" /> Nuevo Atributo
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <Input className="pl-9 h-10 border-slate-200 rounded-xl bg-white" placeholder="Buscar atributo..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(atrib => (
          <div key={atrib.id} className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-100 rounded-xl"><Layers className="w-5 h-5 text-violet-600" /></div>
                <p className="font-black text-slate-800 text-base">{atrib.nombre}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => openEdit(atrib)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(atrib.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {atrib.valores.map(val => (
                <span key={val} className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100 text-xs font-bold rounded-full">{val}</span>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-wider">{atrib.valores.length} valores</p>
          </div>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100">
            <DialogTitle className="font-black text-slate-800">{selected ? "Editar Atributo" : "Nuevo Atributo"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Nombre del Atributo *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Presentación, Tamaño, Sabor..." className="h-11 border-slate-200 rounded-xl font-bold" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Valores (separados por coma)</Label>
              <Input value={form.valores} onChange={e => setForm(f => ({ ...f, valores: e.target.value }))} placeholder="Ej: Cápsulas, Comprimidos, Líquido..." className="h-11 border-slate-200 rounded-xl" />
              {form.valores && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.valores.split(",").map(v => v.trim()).filter(Boolean).map(v => (
                    <span key={v} className="px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-bold rounded-full">{v}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-xl font-black border-slate-200">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.nombre.trim()} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">
                {selected ? "Actualizar" : "Crear Atributo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
