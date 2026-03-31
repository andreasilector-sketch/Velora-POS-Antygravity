"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { 
  Save, 
  UserPlus, 
  Phone, 
  Mail, 
  CreditCard, 
  MapPin, 
  User, 
  ShieldCheck,
  Calendar,
  MessageSquare,
  Gift,
  Target,
  Sparkles
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function CustomerForm({ customer, onSave, onCancel }: any) {
  const { tenant } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: customer || {
      nombre: "",
      documento: "",
      email: "",
      telefono: "",
      direccion: "",
      tipo_cliente: "normal",
      notas: "",
      credito_disponible: 0,
      puntos: 0,
    }
  });

  const tipoCliente = watch("tipo_cliente");

  const onSubmit = async (formData: any) => {
    if (!tenant) return;
    setIsLoading(true);
    
    const payload = {
      ...formData,
      tenant_id: tenant.id,
      credito_disponible: Number(formData.credito_disponible || 0),
      puntos: Number(formData.puntos || 0),
      fecha_registro: customer?.fecha_registro || new Date().toISOString(),
    };

    console.log("Saving customer with payload:", payload);

    let result: any;
    if (customer?.id) {
      result = await (supabase.from("clientes" as any) as any)
        .update(payload as any)
        .eq("id", customer.id);
    } else {
      result = await (supabase.from("clientes" as any) as any)
        .insert(payload as any);
    }

    setIsLoading(false);
    if (result.error) {
      console.error("Supabase Error saving customer:", result.error);
      alert("Error al guardar: " + result.error.message);
    } else {
      onSave();
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Customer Form Validation Errors:", errors);
    alert("Por favor revisa los campos obligatorios.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: IDENTIDAD Y CRM (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SECCIÓN: PERFIL MAESTRO (Bento Cell) */}
          <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" /> PERFIL MAESTRO DEL CLIENTE
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="space-y-3">
                 <Label className="font-black text-slate-700 ml-1">Nombre Completo o Razón Social</Label>
                 <Input 
                   {...register("nombre")} 
                   placeholder="Ej. Alexander Pierce o BioVida Salud S.A.S" 
                   className="h-12 border-slate-200 text-lg font-black bg-white rounded-2xl focus:ring-emerald-500 shadow-sm px-4" 
                   required 
                 />
               </div>

               <div className="space-y-3">
                 <Label className="font-black text-slate-700 ml-1">Documento de Identidad (NIT/CC)</Label>
                 <div className="relative">
                   <Input {...register("documento")} placeholder="1.000.000.000-1" className="h-12 border-slate-200 bg-white rounded-2xl pl-12 text-lg font-bold font-mono" />
                   <CreditCard className="w-5 h-5 text-slate-300 absolute left-4 top-3.5" />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-black text-slate-700 ml-1">Nivel de Fidelización</Label>
                <Select 
                  onValueChange={(val: string | null) => setValue("tipo_cliente", val || "normal")} 
                  defaultValue={customer?.tipo_cliente || "normal"}
                >
                  <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold">
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    <SelectItem value="normal" className="py-3">
                       <span className="flex items-center gap-2 font-bold text-slate-600">
                          <div className="w-2 h-2 bg-slate-300 rounded-full" /> Regular
                       </span>
                    </SelectItem>
                    <SelectItem value="mayorista" className="py-3">
                       <span className="flex items-center gap-2 font-bold text-purple-600">
                          <div className="w-2 h-2 bg-purple-500 rounded-full" /> Mayorista / Distribuidor
                       </span>
                    </SelectItem>
                    <SelectItem value="vip" className="py-3">
                       <span className="flex items-center gap-2 font-bold text-amber-600">
                          <div className="w-2 h-2 bg-amber-500 rounded-full" /> Cliente VIP Gold
                       </span>
                    </SelectItem>
                    <SelectItem value="empleado" className="py-3">
                       <span className="flex items-center gap-2 font-bold text-emerald-600">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Staff / Interno
                       </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECCIÓN: COMUNICACIÓN Y CARTERA (Bento Cell) */}
          {/* SECCIÓN: CREDIT & LOYALTY (Bento Cell) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-rose-50/30 p-6 rounded-[2rem] border border-rose-100 space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-rose-700 uppercase tracking-[0.2em] flex items-center gap-2">
                     <CreditCard className="w-4 h-4" /> CAPACIDAD DE FIADO
                   </h3>
                   <Badge className="bg-rose-600 text-white border-none text-[8px] px-2 font-black uppercase">Crédito Pro</Badge>
                </div>
                <div className="relative">
                   <span className="absolute left-4 top-4 text-rose-400 font-extrabold text-xl">$</span>
                   <Input 
                     type="number" 
                     {...register("credito_disponible")} 
                     className="h-14 pl-10 border-rose-200 bg-white rounded-2xl text-2xl font-black text-rose-800 focus:ring-rose-500 shadow-inner px-4" 
                   />
                </div>
                <p className="text-[9px] text-rose-400 font-bold uppercase text-center tracking-widest">Límite máximo de deuda autorizada</p>
             </div>

             <div className="bg-amber-50/30 p-6 rounded-[2rem] border border-amber-100 space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] flex items-center gap-2">
                     <Gift className="w-4 h-4" /> SISTEMA DE PUNTOS
                   </h3>
                   <Badge className="bg-amber-500 text-white border-none text-[8px] px-2 font-black uppercase">Loyalty</Badge>
                </div>
                <div className="relative">
                   <Input 
                     type="number" 
                     {...register("puntos")} 
                     className="h-14 border-amber-200 bg-white rounded-2xl text-2xl font-black text-slate-800 text-center focus:ring-amber-500 shadow-inner" 
                   />
                   <Sparkles className="absolute right-4 top-4 w-6 h-6 text-amber-200" />
                </div>
                <p className="text-[9px] text-amber-500 font-bold uppercase text-center tracking-widest">Balance actual de puntos para redención</p>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          
          {/* SECCIÓN: COMUNICACIÓN RÁPIDA (Bento Cell) */}
          <div className="bg-emerald-50/30 p-6 rounded-[2rem] border border-emerald-100 space-y-4">
             <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] flex items-center gap-2">
               <Phone className="w-5 h-5" /> Enlace de Contacto
             </h3>
             <div className="space-y-3">
                <div className="relative">
                  <MessageSquare className="w-5 h-5 text-emerald-500 absolute left-4 top-3.5" />
                  <Input {...register("telefono")} placeholder="WhatsApp..." className="h-12 border-emerald-100 bg-white rounded-2xl px-12 font-bold" />
                </div>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-300 absolute left-4 top-3.5" />
                  <Input type="email" {...register("email")} placeholder="Email..." className="h-12 border-slate-200 bg-white rounded-2xl px-12 font-bold" />
                </div>
             </div>
          </div>

          {/* SECCIÓN: LOCALIZACIÓN (Bento Cell) */}
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4 relative overflow-hidden">
             <div className="relative z-10 space-y-4">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Ubicación
                </h3>
                <Input 
                  {...register("direccion")} 
                  placeholder="Dirección..." 
                  className="h-12 border-white/10 bg-white/5 rounded-xl text-white placeholder:text-slate-600 focus:ring-emerald-500" 
                />
             </div>
             <MapPin className="absolute -right-8 -bottom-8 w-32 h-32 text-emerald-500/10 rotate-12" />
          </div>

          {/* SECCIÓN: NOTAS (Bento Cell) */}
          <div className="bg-violet-50/30 p-6 rounded-[2rem] border border-violet-100 space-y-4">
            <h3 className="text-[10px] font-black text-violet-700 uppercase tracking-[0.2em] flex items-center gap-2">
               <Target className="w-5 h-5" /> Notas CRM
            </h3>
            <Textarea 
              {...register("notas")} 
              placeholder="Notas del cliente..." 
              className="min-h-[80px] border-violet-100 bg-white rounded-2xl text-[11px] leading-relaxed resize-none shadow-sm font-medium" 
            />
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel} 
          className="h-12 px-8 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all uppercase text-xs tracking-widest"
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={isLoading} 
          className="h-12 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 transition-all flex gap-3 text-lg"
        >
           {isLoading ? "Sincronizando..." : <><Save className="w-5 h-5" /> GUARDAR</>}
        </Button>
      </div>
    </form>
  );
}
