"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Categoria = { id: string; nombre: string; descripcion: string | null; created_at: string; _count?: number; };

const COLORS = ["emerald","sky","violet","amber","rose","orange","teal","pink"];

export default function CategoriasPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productosCounts, setProductosCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (tenant) fetchData(); }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from("categorias").select("*").eq("tenant_id", tenant!.id).order("nombre");
    if (cats) {
      setCategorias(cats);
      // Count products per category
      const counts: Record<string, number> = {};
      await Promise.all(cats.map(async cat => {
        const { count } = await supabase.from("productos").select("id", { count: "exact", head: true }).eq("categoria_id", cat.id).eq("activo", true);
        counts[cat.id] = count || 0;
      }));
      setProductosCounts(counts);
    }
    setLoading(false);
  };

  const openNew = () => { setSelected(null); setForm({ nombre: "", descripcion: "" }); setIsDialogOpen(true); };
  const openEdit = (c: Categoria) => { setSelected(c); setForm({ nombre: c.nombre, descripcion: c.descripcion || "" }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nombre.trim() || !tenant) return;
    setSaving(true);
    if (selected) {
      await supabase.from("categorias").update({ nombre: form.nombre, descripcion: form.descripcion || null }).eq("id", selected.id);
    } else {
      await supabase.from("categorias").insert({ nombre: form.nombre, descripcion: form.descripcion || null, tenant_id: tenant.id });
    }
    setSaving(false); setIsDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Los productos asociados quedarán sin categoría.")) return;
    await supabase.from("categorias").delete().eq("id", id);
    fetchData();
  };

  const filtered = categorias.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Categorías</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Organiza tu catálogo de productos por categorías</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-100 flex gap-2">
          <Plus className="w-4 h-4" /> Nueva Categoría
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Categorías</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{categorias.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Con Productos</p>
          <p className="text-3xl font-black text-sky-600 mt-1">{categorias.filter(c => (productosCounts[c.id] || 0) > 0).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input className="pl-9 h-10 border-slate-200 rounded-xl" placeholder="Buscar categoría..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-16 text-center text-slate-400 font-black text-xs uppercase animate-pulse">Cargando categorías...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Tag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-400 text-sm">Sin categorías creadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filtered.map((cat, idx) => {
                const color = COLORS[idx % COLORS.length];
                const count = productosCounts[cat.id] || 0;
                return (
                  <div key={cat.id} className={cn("rounded-2xl border-2 p-5 group relative transition-all hover:shadow-md", `border-${color}-100 bg-${color}-50/30`)}>
                    <div className="flex items-start justify-between">
                      <div className={cn("p-2.5 rounded-xl mb-3", `bg-${color}-100`)}>
                        <Tag className={cn("w-5 h-5", `text-${color}-600`)} />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-base">{cat.nombre}</p>
                    {cat.descripcion && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.descripcion}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn("text-xs font-black px-2 py-0.5 rounded-full", `bg-${color}-100 text-${color}-700`)}>{count} productos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100">
            <DialogTitle className="font-black text-slate-800">{selected ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Vitaminas, Jarabes, Suplementos..." className="h-11 border-slate-200 rounded-xl font-bold" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="font-black text-slate-700 text-sm">Descripción (opcional)</Label>
              <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción breve..." className="h-11 border-slate-200 rounded-xl" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-11 rounded-xl font-black border-slate-200">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.nombre.trim()} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">
                {saving ? "Guardando..." : selected ? "Actualizar" : "Crear Categoría"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
