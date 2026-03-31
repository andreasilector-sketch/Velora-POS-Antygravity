"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Tag as TagIcon, 
  Calendar, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Percent,
  TrendingDown,
  Clock,
  Package,
  Layers,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";

type Promotion = {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  cantidad_minima: number;
  cantidad_bonificada: number;
  aplica_a_todo: boolean;
};

export default function PromotionsPage() {
  const { tenant } = useUserProfile();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (tenant) fetchPromotions();
  }, [tenant]);

  const fetchPromotions = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await (supabase.from("promociones" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("id", { ascending: false }); // Order by ID if created_at is missing
    if (data) setPromotions(data as any);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedPromo) return;

    const promoData = {
      ...selectedPromo,
      tenant_id: tenant.id,
      activo: selectedPromo.activo ?? true,
    };

    if (selectedPromo.id) {
      const { error } = await (supabase.from("promociones" as any) as any).update(promoData as any).eq("id", selectedPromo.id);
      if (error) alert(error.message);
    } else {
      const { error } = await (supabase.from("promociones" as any) as any).insert([promoData as any]);
      if (error) alert(error.message);
    }

    fetchPromotions();
    setIsDialogOpen(false);
  };

  const deletePromo = async (id: string) => {
    if (confirm("¿Eliminar esta promoción definitivamente?")) {
      const { error } = await supabase.from("promociones" as any).delete().eq("id", id);
      if (error) alert(error.message);
      fetchPromotions();
    }
  };

  return (
    <div className="space-y-10 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-100">
                <TagIcon className="w-5 h-5" />
             </div>
             <p className="text-xs font-black text-rose-600 uppercase tracking-widest">Motor de Descuentos</p>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">Promociones Activas</h2>
          <p className="text-slate-500 font-medium">Define reglas automáticas para incentivar las ventas en tu POS.</p>
        </div>
        
        <Button 
          onClick={() => {
            setSelectedPromo({ tipo: "descuento", valor: 0, activo: true });
            setIsDialogOpen(true);
          }}
          className="h-14 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-100 flex gap-2 transition-all hover:-translate-y-1"
        >
          <Plus className="w-5 h-5" /> CREAR PROMOCIÓN
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold italic tracking-widest uppercase opacity-40">Sincronizando reglas de descuento...</div>
        ) : promotions.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400">
            <TagIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">No hay promociones configuradas.</p>
            <p className="text-xs mt-1">Empieza creando tu primer 2x1 o descuento por categoría.</p>
          </div>
        ) : (
          promotions.map((promo) => (
            <Card key={promo.id} className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white group hover:border-rose-500 transition-all">
              <div className={cn(
                "h-2",
                promo.activo ? "bg-emerald-500" : "bg-slate-300"
              )} />
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2 uppercase text-[10px] font-black tracking-widest border-rose-100 text-rose-600 bg-rose-50">
                      {promo.tipo}
                    </Badge>
                    <h4 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{promo.nombre}</h4>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl transition-all",
                    promo.activo ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300"
                  )}>
                    {promo.activo ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-500 font-semibold text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    <span>{new Date(promo.fecha_inicio).toLocaleDateString()}</span>
                  </div>
                  <div className="w-2 h-px bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>{new Date(promo.fecha_fin).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Beneficio</p>
                      <p className="text-3xl font-black text-rose-600">
                        {promo.tipo.includes('porcentaje') ? `${promo.valor}%` : `$${promo.valor.toLocaleString()}`}
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condición</p>
                      <p className="text-xs font-bold text-slate-600">Min. {promo.cantidad_minima} unidades</p>
                   </div>
                </div>

                <div className="pt-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl" onClick={() => { setSelectedPromo(promo); setIsDialogOpen(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl" onClick={() => deletePromo(promo.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-rose-600 p-8 text-white">
            <DialogTitle className="text-3xl font-black text-white">Configurar Promoción</DialogTitle>
            <DialogDescription className="text-rose-100 font-medium opacity-80 mt-2">
              Define las reglas de negocio para la aplicación automática del descuento.
            </DialogDescription>
          </div>
          
          <form onSubmit={handleSave}>
            <div className="p-8 grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Campaña</Label>
                <Input 
                  required
                  placeholder="Ej. Black Friday Naturista"
                  className="h-12 border-slate-200 rounded-xl font-bold"
                  value={selectedPromo?.nombre || ""}
                  onChange={(e) => setSelectedPromo({...selectedPromo!, nombre: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Promo</Label>
                <Select value={selectedPromo?.tipo || undefined} onValueChange={(v) => setSelectedPromo({...selectedPromo!, tipo: v})}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="descuento_porcentaje">Porcentaje (%)</SelectItem>
                    <SelectItem value="descuento_fijo">Monto Fijo ($)</SelectItem>
                    <SelectItem value="2x1">2x1 (Lleva 2 paga 1)</SelectItem>
                    <SelectItem value="combo">Combos Especiales</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor / Descuento</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  className="h-12 border-slate-200 rounded-xl font-bold"
                  value={selectedPromo?.valor || ""}
                  onChange={(e) => setSelectedPromo({...selectedPromo!, valor: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2 text-rose-400">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Inicio</Label>
                <Input 
                  type="date"
                  className="h-12 border-slate-200 rounded-xl font-bold"
                  value={selectedPromo?.fecha_inicio?.split('T')[0] || ""}
                  onChange={(e) => setSelectedPromo({...selectedPromo!, fecha_inicio: new Date(e.target.value).toISOString()})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Fin</Label>
                <Input 
                  type="date"
                  className="h-12 border-slate-200 rounded-xl font-bold"
                  value={selectedPromo?.fecha_fin?.split('T')[0] || ""}
                  onChange={(e) => setSelectedPromo({...selectedPromo!, fecha_fin: new Date(e.target.value).toISOString()})}
                />
              </div>

              <div className="col-span-2 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-widest">Alcance de la Promoción</h5>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="aplica_todo" 
                        checked={selectedPromo?.aplica_a_todo}
                        onChange={(e) => setSelectedPromo({...selectedPromo!, aplica_a_todo: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <Label htmlFor="aplica_todo" className="font-bold text-slate-600 cursor-pointer">Aplica a todo el catálogo</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="promo_activa" 
                        checked={selectedPromo?.activo}
                        onChange={(e) => setSelectedPromo({...selectedPromo!, activo: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <Label htmlFor="promo_activa" className="font-bold text-slate-600 cursor-pointer">Activar inmediatamente</Label>
                   </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 px-8 font-bold text-slate-500">Cancelar</Button>
              <Button 
                type="submit"
                className="h-14 px-12 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-100"
              >
                {selectedPromo?.id ? "GUARDAR CAMBIOS" : "CREAR PROMOCIÓN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
