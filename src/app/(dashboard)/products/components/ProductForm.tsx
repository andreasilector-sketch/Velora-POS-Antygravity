"use client";

import React, { useState, useEffect } from "react";
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
  BrainCircuit, 
  Scale, 
  Save, 
  Sparkles, 
  DollarSign, 
  Percent, 
  ArrowRightLeft,
  Info,
  Layers,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function ProductForm({ product, onSave, onCancel }: any) {
  const { tenant } = useUserProfile();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm({
    defaultValues: product || {
      nombre: "",
      sku: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
      codigo_barras: "",
      precio_compra: 0,
      precio_venta: 0,
      precio_minimo: 0,
      margen_ganancia: 30, // Default 30% margin
      tipo_precio: "fijo", // 'fijo' or 'margen'
      stock_minimo: 5,
      es_fraccionado: false,
      factor_conversion: 1,
      beneficios: "",
      sintomas_alivia: "",
      ingredientes: "",
      categoria_id: "",
      descuento: 0,
      stock_actual: 0,
      tipo_item: "Producto",
      unidad_medida: "Unidad",
      bodega: "Principal",
      impuesto_porcentaje: 0,
      fecha_vencimiento: null,
    }
  });

  // Log validation errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.warn("Validation errors in ProductForm:", errors);
    }
  }, [errors]);

  const watchAllFields = watch();
  const { 
    es_fraccionado: esFraccionado, 
    precio_compra: precioCompra, 
    precio_venta: precioVenta,
    margen_ganancia: margenGanancia,
    tipo_precio: tipoPrecio
  } = watchAllFields;

  useEffect(() => {
    if (tenant) {
      fetchCategories();
    }
  }, [tenant]);

  // Pricing Logic Synchronization
  useEffect(() => {
    const pCompra = Number(precioCompra) || 0;
    const pVenta = Number(precioVenta) || 0;
    const tax = Number(watch("impuesto_porcentaje")) || 0;

    if (tipoPrecio === 'margen') {
      const margin = Number(margenGanancia) || 0;
      const calculatedVenta = pCompra * (1 + margin / 100);
      setValue("precio_venta", Math.round(calculatedVenta), { shouldDirty: true });
    } else if (tipoPrecio === 'fijo') {
      if (pCompra > 0 && pVenta > 0) {
        const calculatedMargin = ((pVenta - pCompra) / pCompra) * 100;
        setValue("margen_ganancia", Math.round(calculatedMargin * 100) / 100, { shouldDirty: false });
      }
    }
  }, [precioCompra, margenGanancia, tipoPrecio, precioVenta, watch("impuesto_porcentaje"), setValue]);

  const totalConImpuesto = Math.round(Number(precioVenta || 0) * (1 + (Number(watch("impuesto_porcentaje")) || 0) / 100));

  const fetchCategories = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("categorias" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("nombre");
    if (data) setCategories(data);
  };

  const onSubmit = async (formData: any) => {
    if (!tenant) return;
    setIsLoading(true);
    
    try {
      // Explicitly pick only matching database columns to prevent Supabase errors
      const payload = {
        tenant_id: tenant.id,
        nombre: formData.nombre,
        sku: formData.sku || null,
        codigo_barras: formData.codigo_barras || null,
        categoria_id: formData.categoria_id && formData.categoria_id !== "" ? formData.categoria_id : null,
        stock_minimo: Number(formData.stock_minimo) || 0,
        stock_actual: Number(formData.stock_actual) || 0,
        precio_compra: Number(formData.precio_compra) || 0,
        precio_venta: Number(formData.precio_venta) || 0,
        precio_minimo: Number(formData.precio_minimo) || 0,
        margen_ganancia: Number(formData.margen_ganancia) || 0,
        tipo_precio: formData.tipo_precio || "fijo",
        es_fraccionado: !!formData.es_fraccionado,
        factor_conversion: Number(formData.factor_conversion) || 1,
        beneficios: formData.beneficios || null,
        sintomas_alivia: formData.sintomas_alivia || null,
        ingredientes: formData.ingredientes || null,
        descuento: Number(formData.descuento) || 0,
        tipo_item: formData.tipo_item || "Producto",
        unidad_medida: formData.unidad_medida || "Unidad",
        bodega: formData.bodega || "Principal",
        impuesto_porcentaje: Number(formData.impuesto_porcentaje) || 0,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        updated_at: new Date().toISOString(),
      };

      console.log("Saving product with payload:", payload);

      let result: any;
      if (product?.id) {
        result = await supabase.from("productos").update(payload).eq("id", product.id);
      } else {
        result = await supabase.from("productos").insert(payload);
      }

      if (result.error) throw result.error;
      
      onSave();
    } catch (err: any) {
      console.error("Error saving product:", err);
      alert("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    alert("Por favor revisa los campos obligatorios.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 font-sans flex flex-col h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        
        {/* COLUMNA IZQUIERDA: BASICS & PRICE (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* SECCIÓN: IDENTIFICACIÓN (Bento Cell) */}
          <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Identidad del Producto
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-3 border-b border-slate-100">
               <div className="space-y-1">
                 <Label className="font-black text-slate-700 ml-1 text-sm flex items-center gap-1">Tipo de ítem <Info className="w-3 h-3 text-slate-300"/></Label>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   {['Producto', 'Servicio', 'Combo'].map(t => (
                     <button
                       key={t}
                       type="button"
                       onClick={() => setValue("tipo_item", t, { shouldDirty: true })}
                       className={cn(
                         "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                         watch("tipo_item") === t ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                       )}
                     >
                       {t}
                     </button>
                   ))}
                 </div>
               </div>
               <div className="space-y-1">
                 <Label className="font-black text-slate-700 ml-1 text-sm">Unidad de medida</Label>
                 <Select onValueChange={(val: string | null) => setValue("unidad_medida", val || "Unidad", { shouldDirty: true })} value={watch("unidad_medida") || "Unidad"}>
                   <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl text-base font-bold text-slate-700 shadow-sm">
                     <SelectValue placeholder="Unidad" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl border-slate-100 shadow-2xl font-bold">
                     <SelectItem value="Unidad">Unidad</SelectItem>
                     <SelectItem value="Gramo">Gramo</SelectItem>
                     <SelectItem value="Kilogramo">Kilogramo</SelectItem>
                     <SelectItem value="Litro">Litro</SelectItem>
                     <SelectItem value="Mililitro">Mililitro</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1">
                 <Label className="font-black text-slate-700 ml-1 text-sm">Bodega</Label>
                 <Select onValueChange={(val: string | null) => setValue("bodega", val || "Principal", { shouldDirty: true })} value={watch("bodega") || "Principal"}>
                   <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl text-base font-bold text-slate-700 shadow-sm">
                     <SelectValue placeholder="Principal" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl border-slate-100 shadow-2xl font-bold">
                     <SelectItem value="Principal">Principal</SelectItem>
                     <SelectItem value="Bodega Norte">Bodega Norte</SelectItem>
                     <SelectItem value="Bodega Sur">Bodega Sur</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="font-black text-slate-700 ml-1 text-sm">Nombre Comercial</Label>
              <Input 
                {...register("nombre")} 
                placeholder="Ej. Colágeno Hidrolizado + Vitamina C" 
                autoComplete="off"
                autoCorrect="off"
                className="h-12 border-slate-200 text-xl font-bold bg-white rounded-xl focus:ring-emerald-500 shadow-sm" 
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-slate-700 ml-1 text-sm">SKU / Referencia</Label>
                <div className="relative">
                  <Input {...register("sku")} placeholder="REF-001" autoComplete="off" autoCorrect="off" className="h-11 border-slate-200 bg-white rounded-xl pl-10 text-base font-bold text-slate-600" />
                  <Info className="w-5 h-5 text-slate-300 absolute left-3 top-3" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-black text-slate-700 ml-1 text-sm">Código de Barras</Label>
                <Input {...register("codigo_barras")} placeholder="000000000000" inputMode="numeric" autoComplete="off" className="h-11 border-slate-200 bg-white rounded-xl text-base font-bold text-slate-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-slate-700 ml-1 text-sm">Categoría Maestro</Label>
                <Select 
                  onValueChange={(val: string | null) => setValue("categoria_id", val || "", { shouldDirty: true })} 
                  value={watch("categoria_id") || ""}
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl text-base font-bold text-slate-700">
                    <SelectValue placeholder="Seleccionar categoría">
                      {watch("categoria_id") && categories.find((c: any) => c.id === watch("categoria_id"))?.nombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id} className="font-bold text-base text-slate-700">
                        {cat.nombre}
                       </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-black text-sky-700 ml-1 flex items-center justify-between text-sm">Stock Actual <Badge className="bg-sky-500 text-white border-none text-[8px] px-1 font-black">NUEVO</Badge></Label>
                <Input type="number" inputMode="numeric" autoComplete="off" onFocus={(e) => e.target.select()} {...register("stock_actual")} className="h-11 border-sky-200 bg-sky-50 text-sky-900 font-bold rounded-xl focus:ring-sky-500 shadow-inner text-lg" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-slate-700 ml-1 text-sm">Stock Alerta (Min)</Label>
                <Input type="number" inputMode="numeric" autoComplete="off" onFocus={(e) => e.target.select()} {...register("stock_minimo")} className="h-11 border-slate-200 bg-white rounded-xl text-lg font-bold text-slate-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100/50">
              <div className="space-y-1">
                <Label className="font-black text-slate-700 ml-1 text-sm flex items-center gap-2">
                   <Calendar className="w-4 h-4 text-rose-500" /> Fecha de Vencimiento
                </Label>
                <Input 
                   type="date" 
                   {...register("fecha_vencimiento")} 
                   className="h-12 border-slate-200 bg-white rounded-xl text-base font-bold text-slate-600 focus:ring-rose-500 shadow-sm" 
                />
              </div>
              <div className="flex items-end pb-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight italic">
                  Opcional. El sistema notificará cuando el producto esté próximo a vencer.
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN: ESTRATEGIA DE PRECIOS (Bento Cell) */}
          <div className="bg-emerald-50/30 p-5 rounded-[1.5rem] border border-emerald-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Estrategia Comercial
              </h3>
              <div className="flex bg-white/50 p-1 rounded-xl border border-emerald-100">
                <button 
                  type="button"
                  onClick={() => setValue("tipo_precio", "fijo")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    tipoPrecio === 'fijo' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Fijo
                </button>
                <button 
                  type="button"
                  onClick={() => setValue("tipo_precio", "margen")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ml-1",
                    tipoPrecio === 'margen' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Margen %
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="font-black text-slate-700 text-sm">Precio Compra</Label>
                  <Badge variant="outline" className="text-[9px] bg-white border-slate-100 text-slate-500 font-bold">COSTO</Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-lg">$</span>
                  <Input 
                    type="number" 
                    inputMode="decimal"
                    step="0.01"
                    autoComplete="off"
                    onFocus={(e) => e.target.select()}
                    {...register("precio_compra")} 
                    className="h-11 pl-8 border-slate-200 bg-white rounded-xl text-lg font-black focus:ring-emerald-500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                 <Label className="font-black text-slate-700 text-sm mb-1 block">Impuesto</Label>
                 <Select onValueChange={(val: string | null) => setValue("impuesto_porcentaje", Number(val), { shouldDirty: true })} value={String(watch("impuesto_porcentaje") || 0)}>
                   <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl text-base font-bold text-slate-700 shadow-sm">
                     <SelectValue placeholder="Ninguno (0%)" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl border-slate-100 shadow-2xl font-bold">
                     <SelectItem value="0">Ninguno (0%)</SelectItem>
                     <SelectItem value="5">IVA (5%)</SelectItem>
                     <SelectItem value="19">IVA (19%)</SelectItem>
                     <SelectItem value="8">Impoconsumo (8%)</SelectItem>
                   </SelectContent>
                 </Select>
              </div>

              <div className={cn(
                "space-y-1 transition-all duration-300",
                tipoPrecio === 'fijo' ? "opacity-30 scale-95 pointer-events-none" : "opacity-100 scale-100"
              )}>
                <div className="flex items-center justify-center">
                  <Label className="font-black text-sm text-center text-emerald-700">
                    Margen de Utilidad
                  </Label>
                </div>
                <div className="relative">
                  <Input 
                    type="number" 
                    inputMode="decimal"
                    autoComplete="off"
                    onFocus={(e) => e.target.select()}
                    {...register("margen_ganancia")}
                    className="h-11 border-emerald-200 bg-white rounded-xl text-2xl font-black text-center pr-8 focus:ring-emerald-500 shadow-sm transition-all text-emerald-700"
                  />
                  <Percent className="w-5 h-5 absolute right-3 top-3 text-emerald-300" />
                </div>
              </div>

              <div className={cn(
                "space-y-1 transition-all duration-300",
                tipoPrecio === 'margen' ? "opacity-30 scale-95 pointer-events-none" : "opacity-100 scale-100"
              )}>
                <div className="flex items-center justify-between">
                  <Label className="font-black text-slate-700 text-sm">Precio Venta (Base)</Label>
                  <Badge variant="outline" className="text-[9px] bg-emerald-600 text-white border-none font-bold">PÚBLICO</Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 font-bold text-xl">$</span>
                  <Input 
                    type="number" 
                    inputMode="numeric"
                    autoComplete="off"
                    onFocus={(e) => e.target.select()}
                    {...register("precio_venta")} 
                    className="h-11 pl-9 border-emerald-200 bg-white rounded-xl text-2xl font-black focus:ring-emerald-500 shadow-inner text-emerald-800"
                  />
                </div>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/40 p-3 rounded-2xl border border-emerald-100/50">
                 <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Impuesto ({watch("impuesto_porcentaje") || 0}%):</span>
                    <span className="font-black text-slate-700 text-lg">
                      ${Math.round((Number(precioVenta) || 0) * (Number(watch("impuesto_porcentaje")) || 0) / 100).toLocaleString()}
                    </span>
                 </div>
                 <div className="bg-emerald-600 p-2 rounded-xl flex items-center justify-between px-4 shadow-lg shadow-emerald-100">
                    <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Total con Impuesto:</span>
                    <span className="font-black text-white text-2xl">
                      ${totalConImpuesto.toLocaleString()}
                    </span>
                 </div>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-100/50 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex-1 space-y-1">
                    <Label className="font-black text-slate-700 text-sm flex items-center gap-2">
                      <Percent className="w-4 h-4 text-emerald-500" /> Descuento Predeterminado (%)
                    </Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        inputMode="decimal"
                        autoComplete="off"
                        onFocus={(e) => e.target.select()}
                        {...register("descuento")} 
                        placeholder="Ej: 10%" 
                        className="h-11 border-emerald-100 bg-white/50 rounded-xl font-bold text-lg text-emerald-700 focus:ring-emerald-500" 
                      />
                      <Percent className="w-4 h-4 text-emerald-300 absolute right-4 top-3.5" />
                    </div>
                 </div>
                 <div className="max-w-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-snug tracking-tight">
                      Este porcentaje se aplicará automáticamente al añadir el producto al carrito en el POS.
                    </p>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-emerald-50 pt-3">
                 <div className="flex-1 space-y-1">
                    <Label className="font-black text-rose-700 text-sm flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-rose-500" /> Venta Mínima Autorizada (Piso)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-rose-400 font-bold text-lg">$</span>
                      <Input 
                        type="number" 
                        inputMode="numeric"
                        autoComplete="off"
                        onFocus={(e) => e.target.select()}
                        {...register("precio_minimo")} 
                        placeholder="Valor base..." 
                        className="h-11 pl-8 border-rose-100 bg-white/50 rounded-xl font-bold text-lg text-rose-800 focus:ring-rose-500" 
                      />
                    </div>
                 </div>
                 <div className="max-w-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-snug tracking-tight">
                      El sistema impedirá que este producto se venda por debajo de este valor, incluso con descuentos.
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CONFIG & IA (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* SECCIÓN: ESTRUCTURA (Bento Cell) */}
          <div className={cn(
            "p-5 rounded-[1.5rem] border transition-all space-y-3 flex flex-col justify-between h-fit",
            esFraccionado ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100"
          )}>
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-800">
                     <div className={cn("p-2 rounded-xl border", esFraccionado ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-400")}>
                        <Scale className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="font-black text-sm">Fraccionamiento</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-tight">Venta por dosis o unidades</p>
                     </div>
                  </div>
                  <Switch 
                     checked={esFraccionado}
                     onCheckedChange={(val: boolean) => setValue("es_fraccionado", val)}
                  />
               </div>

               {esFraccionado && (
                  <div className="pt-4 border-t border-amber-200 space-y-2 animate-in slide-in-from-top-2">
                     <div className="space-y-1">
                        <Label className="font-black text-amber-800 text-xs uppercase ml-1">Contenido por Envase</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            inputMode="numeric"
                            autoComplete="off"
                            onFocus={(e) => e.target.select()}
                            {...register("factor_conversion")} 
                            placeholder="Ej: 60 (ml), 30 (capsulas)" 
                            className="h-11 border-amber-300 bg-white rounded-xl focus:ring-amber-500 font-black text-amber-900 text-lg" 
                          />
                          <Layers className="w-5 h-5 text-amber-300 absolute right-3 top-3" />
                        </div>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">Define cuántas unidades de venta tiene este envase.</p>
                     </div>
                  </div>
               )}
             </div>
          </div>

          {/* SECCIÓN: IA KNOWLEDGE (Bento Cell) */}
          <div className="bg-violet-50/30 p-5 rounded-[1.5rem] border border-violet-100 space-y-3">
            <h3 className="text-[11px] font-black text-violet-700 uppercase tracking-[0.2em] flex items-center gap-2">
               <BrainCircuit className="w-5 h-5" /> Sabiduría Naturista
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="font-black text-slate-700 text-[11px] uppercase ml-1 text-sm">Beneficios</Label>
                <Textarea {...register("beneficios")} placeholder="Ej. Aumenta la energía y reduce estrés" className="min-h-[44px] border-violet-100 bg-white rounded-xl text-sm leading-relaxed focus:ring-violet-500 resize-none shadow-sm font-medium text-slate-600" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-slate-700 text-[11px] uppercase ml-1 text-sm">Síntomas</Label>
                <Textarea {...register("sintomas_alivia")} placeholder="Ej. Ansiedad, Insomnio..." className="min-h-[44px] border-violet-100 bg-white rounded-xl text-sm leading-relaxed focus:ring-violet-500 resize-none shadow-sm font-medium text-slate-600" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-slate-700 text-[11px] uppercase ml-1 text-sm">Composición</Label>
                <Textarea {...register("ingredientes")} placeholder="Ej. Extracto de raíz 5%, ..." className="min-h-[44px] border-violet-100 bg-white rounded-xl text-sm leading-relaxed focus:ring-violet-500 resize-none shadow-sm font-medium text-slate-600" />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS (MOVED TO RIGHT COLUMN) */}
          <div className="flex justify-end gap-3 pt-4 mt-auto">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel} 
              className="h-12 flex-1 rounded-xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all uppercase text-xs tracking-widest border border-slate-200 bg-white shadow-sm"
            >
              Descartar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading} 
              className="h-12 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xl shadow-emerald-200 transition-all flex gap-2 justify-center text-xs tracking-widest"
            >
               {isLoading ? "Guardando..." : <><Save className="w-4 h-4" /> GUARDAR PRODUCTO</>}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
