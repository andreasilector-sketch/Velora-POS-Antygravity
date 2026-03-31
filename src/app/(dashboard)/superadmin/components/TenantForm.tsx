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
import {
  Building2,
  Mail,
  MapPin,
  ShieldCheck,
  Key,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

import { provisionTenantAction } from "../actions";

export function TenantForm({ onSave, onCancel }: any) {
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nombre_empresa: "",
      email: "",
      nit: "",
      telefono: "",
      plan: "basico",
      nombre_sucursal: "Sede Principal",
      password: "",
    }
  });

  const onSubmit = async (formData: any) => {
    console.log("Submit invocado con data:", formData);
    setIsLoading(true);

    try {
      const result = await provisionTenantAction(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Success
      onSave();
    } catch (err: any) {
      console.error("Error Provisioning Tenant:", err);
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 font-sans w-full min-w-[750px]">
      {/* FORZAMOS LAS 2 COLUMNAS AQUÍ */}
      <div className="grid grid-cols-2 gap-8 items-start w-full">

        {/* Columna Izquierda: Identidad Corporativa */}
        <div className="space-y-6 bg-slate-50/50 p-7 rounded-[2rem] border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600" /> Identidad Corporativa
          </h3>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 text-xs">Razón Social <span className="text-rose-500">*</span></Label>
              <Input
                {...register("nombre_empresa", { required: true })}
                placeholder="Ej. Distribuidora Naturista Velora"
                className={cn("h-12 border-slate-200 bg-white rounded-xl focus:ring-purple-500 font-medium", errors.nombre_empresa && "border-rose-500 ring-rose-500")}
              />
              {errors.nombre_empresa && <p className="text-rose-500 text-[10px] ml-1 font-bold">Razón social requerida</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 ml-1 text-xs">NIT / RUT</Label>
                <Input {...register("nit")} placeholder="900.123.456-1" className="h-11 border-slate-200 bg-white rounded-xl focus:ring-purple-500" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 ml-1 text-xs">Teléfono</Label>
                <Input {...register("telefono")} placeholder="601..." className="h-11 border-slate-200 bg-white rounded-xl focus:ring-purple-500" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 text-xs">Plan de Suscripción</Label>
              <Select onValueChange={(val) => { if (val) setValue("plan", val); }} defaultValue="basico">
                <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl focus:ring-purple-500">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                  <SelectItem value="basico" className="font-bold text-slate-600">Plan Básico (1 Sede)</SelectItem>
                  <SelectItem value="premium" className="font-bold text-purple-600">Plan Premium (Multi-Sede)</SelectItem>
                  <SelectItem value="enterprise" className="font-bold text-slate-900">Enterprise (Ilimitado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Acceso Administrativo */}
        <div className="space-y-6 bg-purple-50/30 p-7 rounded-[2rem] border border-purple-100/50">
          <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Credenciales de Acceso
          </h3>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 text-xs">Email del Propietario <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                <Input
                  type="email"
                  {...register("email", { required: true })}
                  placeholder="dueño@empresa.com"
                  className={cn("h-12 pl-10 border-purple-100 bg-white rounded-xl focus:ring-purple-500 font-bold", errors.email && "border-rose-500 ring-rose-500")}
                />
              </div>
              <p className="text-[9px] text-purple-400 font-medium ml-1">Se le enviará un correo de verificación.</p>
              {errors.email && <p className="text-rose-500 text-[10px] ml-1 font-bold">Email es obligatorio</p>}
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 text-xs">Contraseña Temporal</Label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <Input
                  type="password"
                  {...register("password")}
                  placeholder="Velora2024*"
                  className="h-12 pl-10 border-slate-200 bg-white rounded-xl focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-purple-100">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 ml-1 text-xs flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-purple-500" /> Sede Inicial de Operación
                </Label>
                <Input
                  {...register("nombre_sucursal")}
                  placeholder="Ej. Sede Norte"
                  className="h-11 border-purple-50/50 bg-white/70 rounded-xl focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-12 px-8 rounded-xl font-black text-slate-400 hover:text-slate-600 transition-all uppercase text-xs tracking-widest"
        >
          Descartar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 px-12 bg-slate-900 hover:bg-black text-white font-black rounded-xl shadow-xl transition-all hover:scale-[1.02] flex gap-2"
        >
          {isLoading ? "Provisionando..." : <><Globe className="w-5 h-5 text-purple-400" /> PROVISIONAR ENTORNO</>}
        </Button>
      </div>
    </form>
  );
}