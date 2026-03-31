"use client";

import React, { useState, useEffect } from "react";
import { 
  Store, 
  Receipt, 
  Printer, 
  CreditCard, 
  Plus, 
  Trash2, 
  Save, 
  Building2,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Settings2,
  FileText,
  Edit2,
  Tags,
  PackageSearch
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";
import { manageUserAction, deleteUserAction } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { profile, tenant, loading: fetchingProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState("empresa");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const supabase = createClient();

  // Form States
  const [tenantData, setTenantData] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Dialog States
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    if (tenant) {
      setTenantData(tenant);
      fetchBankAccounts();
      fetchUsers();
      fetchSucursales();
    }
  }, [tenant]);

  const fetchBankAccounts = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("cuentas_bancarias" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id);
    if (data) setBankAccounts(data);
  };

  const fetchSucursales = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("sucursales" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id);
    if (data) setSucursales(data);
  };

  const fetchUsers = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("usuarios" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id);
    if (data) setUsers(data);
  };

  const handleSaveTenant = async () => {
    if (!tenantData || !tenant) return;
    setIsSaving(true);
    const { error } = await (supabase.from("tenants" as any) as any)
      .update({
        nombre_empresa: tenantData.nombre_empresa,
        nit: tenantData.nit,
        direccion_fiscal: tenantData.direccion_fiscal,
        telefono: tenantData.telefono,
        correo_contacto: tenantData.correo_contacto,
        pais: tenantData.pais,
        departamento: tenantData.departamento,
        municipio: tenantData.municipio,
        logo_url: tenantData.logo_url,
        configuracion_pos: tenantData.configuracion_pos
      })
      .eq("id", tenant.id);
    
    setIsSaving(false);
    if (error) alert("Error al guardar: " + error.message);
    else alert("Configuración guardada con éxito");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !tenant) return;
    const file = e.target.files[0];
    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.id}-${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('tenant_assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('tenant_assets').getPublicUrl(filePath);
      setTenantData({...tenantData, logo_url: data.publicUrl});
    } catch(err: any) {
      alert("Error subiendo logo: " + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setTenantData({...tenantData, logo_url: null});
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      tenant_id: tenant.id,
      nombre_banco: formData.get("nombre_banco"),
      numero_cuenta: formData.get("numero_cuenta"),
      titular: formData.get("titular"),
      activo: true
    };

    if (editingBank?.id) {
      await (supabase.from("cuentas_bancarias" as any) as any).update(payload).eq("id", editingBank.id);
    } else {
      await (supabase.from("cuentas_bancarias" as any) as any).insert(payload);
    }
    fetchBankAccounts();
    setIsBankDialogOpen(false);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      tenant_id: tenant.id,
      nombre: formData.get("nombre"),
      direccion: formData.get("direccion"),
      telefono: formData.get("telefono"),
      ciudad: formData.get("ciudad")
    };

    if (editingBranch?.id) {
       await (supabase.from("sucursales" as any) as any).update(payload).eq("id", editingBranch.id);
    } else {
       await (supabase.from("sucursales" as any) as any).insert(payload);
    }
    fetchSucursales();
    setIsBranchDialogOpen(false);
  };

  const deleteBranch = async (id: string) => {
    if (confirm("¿Seguro que deseas eliminar esta sede? (Podría afectar registros históricos)")) {
      await (supabase.from("sucursales" as any) as any).delete().eq("id", id);
      fetchSucursales();
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      id: editingUser?.id,
      tenant_id: tenant.id,
      auth_user_id: editingUser?.auth_user_id,
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      rol: formData.get("rol"),
      sucursal_id: formData.get("sucursal_id"),
      password: formData.get("password") || undefined,
      activo: formData.get("activo") === 'true'
    };

    const res = await manageUserAction(payload);
    if (res?.error) {
      alert("Error: " + res.error);
    } else {
      fetchUsers();
      setIsUserDialogOpen(false);
    }
  };

  const deleteUser = async (u: any) => {
    if (confirm("¿Estás seguro de eliminar este usuario del sistema definitivamente?")) {
       const res = await deleteUserAction({user_db_id: u.id, auth_user_id: u.auth_user_id});
       if(res?.error) alert(res.error);
       else fetchUsers();
    }
  };

  const deleteBank = async (id: string) => {
    if (confirm("¿Eliminar esta cuenta bancaria?")) {
      await (supabase.from("cuentas_bancarias" as any) as any).delete().eq("id", id);
      fetchBankAccounts();
    }
  };

  if (fetchingProfile) return (
    <div className="p-24 text-center">
       <div className="animate-pulse space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto" />
          <p className="text-slate-400 font-black italic uppercase tracking-widest text-xs opacity-60">Cargando configuración...</p>
       </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 font-sans overflow-visible">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100">
              <Settings2 className="w-10 h-10" />
           </div>
           <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-800">Panel de Control</h2>
              <p className="text-slate-500 font-medium tracking-tight">Estructura SaaS, reglamentación y recursos del sistema Velora.</p>
           </div>
        </div>
        <Button 
          onClick={handleSaveTenant} 
          disabled={isSaving}
          className="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02] flex gap-3 items-center"
        >
          {isSaving ? "Guardando..." : <><Save className="w-5 h-5" /> Guardar Cambios Globales</>}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col lg:flex-row gap-10 w-full">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-1/4">
           <TabsList className="flex flex-col justify-start bg-white border border-slate-100 shadow-xl shadow-slate-100/50 p-6 rounded-3xl h-fit sticky top-6 space-y-3 w-full">
             <div className="mb-4 px-2 pb-4 border-b border-slate-100 w-full text-left">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Menú de Ajustes</h3>
             </div>

             <TabsTrigger 
               value="empresa" 
               className="justify-start w-full rounded-2xl p-4 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none hover:bg-slate-50 transition-all flex gap-3 font-black text-xs uppercase tracking-widest cursor-pointer"
             >
               <Building2 className="w-5 h-5" /> Empresa
             </TabsTrigger>

             <TabsTrigger 
               value="sucursales" 
               className="justify-start w-full rounded-2xl p-4 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none hover:bg-slate-50 transition-all flex gap-3 font-black text-xs uppercase tracking-widest cursor-pointer"
             >
               <MapPin className="w-5 h-5" /> Sedes
             </TabsTrigger>

             <TabsTrigger 
               value="usuarios" 
               className="justify-start w-full rounded-2xl p-4 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none hover:bg-slate-50 transition-all flex gap-3 font-black text-xs uppercase tracking-widest cursor-pointer"
             >
               <Users className="w-5 h-5" /> Personal
             </TabsTrigger>

             <TabsTrigger 
               value="bancos" 
               className="justify-start w-full rounded-2xl p-4 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none hover:bg-slate-50 transition-all flex gap-3 font-black text-xs uppercase tracking-widest cursor-pointer"
             >
               <CreditCard className="w-5 h-5" /> Bancos
             </TabsTrigger>

             <TabsTrigger 
               value="facturacion" 
               className="justify-start w-full rounded-2xl p-4 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none hover:bg-slate-50 transition-all flex gap-3 font-black text-xs uppercase tracking-widest cursor-pointer"
             >
               <FileText className="w-5 h-5" /> DIAN
             </TabsTrigger>

             <TabsTrigger 
               value="recibo" 
               className="justify-start w-full rounded-2xl p-4 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none hover:bg-slate-50 transition-all flex gap-3 font-black text-xs uppercase tracking-widest cursor-pointer"
             >
               <Printer className="w-5 h-5" /> Recibo
             </TabsTrigger>
           </TabsList>
        </div>

        {/* CONTENT AREA */}
        <div className="w-full lg:w-3/4 flex-1">
          {/* --- PESTAÑA EMPRESA --- */}
        <TabsContent value="empresa" className="space-y-6">
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-8">
              <CardTitle className="text-2xl font-black text-slate-800">Identidad Corporativa</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Información básica y legal del negocio principal.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Nombre del Establecimiento</Label>
                  <Input 
                    value={tenantData?.nombre_empresa || ""} 
                    onChange={(e) => setTenantData({...tenantData, nombre_empresa: e.target.value})}
                    placeholder="Ej. Red Unión Saludable" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl text-lg font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">NIT / RUT</Label>
                  <Input 
                    value={tenantData?.nit || ""} 
                    onChange={(e) => setTenantData({...tenantData, nit: e.target.value})}
                    placeholder="Ej. 901.234.567-8" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl font-mono"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Sede Principal - Dirección Fiscal</Label>
                  <Input 
                    value={tenantData?.direccion_fiscal || ""} 
                    onChange={(e) => setTenantData({...tenantData, direccion_fiscal: e.target.value})}
                    placeholder="Ej. Calle 123 # 45-67" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Teléfono de Contacto</Label>
                  <Input 
                    value={tenantData?.telefono || ""} 
                    onChange={(e) => setTenantData({...tenantData, telefono: e.target.value})}
                    placeholder="Ej. +57 301 222 3344" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Correo de Contacto</Label>
                  <Input 
                    type="email"
                    value={tenantData?.correo_contacto || ""} 
                    onChange={(e) => setTenantData({...tenantData, correo_contacto: e.target.value})}
                    placeholder="contacto@empresa.com" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">País</Label>
                  <Input 
                    value={tenantData?.pais || ""} 
                    onChange={(e) => setTenantData({...tenantData, pais: e.target.value})}
                    placeholder="Colombia" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Departamento</Label>
                  <Input 
                    value={tenantData?.departamento || ""} 
                    onChange={(e) => setTenantData({...tenantData, departamento: e.target.value})}
                    placeholder="Ej. Antioquia" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Municipio / Ciudad</Label>
                  <Input 
                    value={tenantData?.municipio || ""} 
                    onChange={(e) => setTenantData({...tenantData, municipio: e.target.value})}
                    placeholder="Ej. Medellín" 
                    className="h-14 border-slate-200 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-10">
                 <div className="w-32 h-32 bg-slate-50 rounded-3xl border-4 border-double border-slate-200 flex items-center justify-center text-slate-300 group hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer relative overflow-hidden shadow-inner flex-shrink-0">
                    {tenantData?.logo_url ? (
                      <img src={tenantData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Store className="w-10 h-10 group-hover:text-emerald-500 transition-colors" />
                    )}
                 </div>
                 <div className="space-y-2 flex-1">
                    <h4 className="font-black text-xl text-slate-800 tracking-tight">Identidad Visual</h4>
                    <p className="text-sm text-slate-500 max-w-sm font-medium">Sube tu logo institucional. Este aparecerá en el POS, facturas electrónicas y PDFs.</p>
                    <div className="pt-2 flex gap-3 font-sans">
                       <input type="file" id="logoUpload" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                       <label htmlFor="logoUpload" className="cursor-pointer inline-flex h-12 px-8 bg-slate-800 hover:bg-black text-white rounded-xl font-bold items-center justify-center transition-colors">
                          {isUploadingLogo ? 'Subiendo...' : 'Subir Imagen'}
                       </label>
                       {tenantData?.logo_url && (
                         <Button variant="outline" onClick={handleRemoveLogo} className="h-12 px-8 border-slate-200 rounded-xl font-bold">Remover</Button>
                       )}
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA SUCURSALES --- */}
        <TabsContent value="sucursales" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sucursales.map((s) => (
                <Card key={s.id} className="border-none shadow-xl rounded-3xl overflow-hidden group hover:shadow-2xl transition-all">
                   <div className="h-2 bg-emerald-500" />
                   <CardContent className="p-8">
                      <div className="flex justify-between mb-4">
                         <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <MapPin className="w-6 h-6" />
                         </div>
                         <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => deleteBranch(s.id)} className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingBranch(s); setIsBranchDialogOpen(true); }} className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></Button>
                         </div>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 mb-2">{s.nombre}</h4>
                      <div className="space-y-2 text-sm text-slate-500 font-medium">
                         <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-300" /> {s.direccion}</p>
                         <p className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-300" /> {s.telefono || 'Sin teléfono'}</p>
                         <p className="font-black text-emerald-600/60 uppercase text-[10px] tracking-widest">{s.ciudad}</p>
                      </div>
                   </CardContent>
                </Card>
              ))}
              <Button 
                onClick={() => { setEditingBranch(null); setIsBranchDialogOpen(true); }}
                variant="outline"
                className="h-auto min-h-[220px] rounded-3xl border-4 border-dashed border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 flex flex-col gap-4 text-slate-300 hover:text-emerald-600 transition-all group"
              >
                <Plus className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                   <p className="font-black text-lg uppercase tracking-widest">Añadir Sede</p>
                   <p className="text-xs max-w-[200px] mt-1 font-medium italic opacity-60 px-4">Expande tu negocio a nuevos puntos de venta.</p>
                </div>
              </Button>
           </div>
        </TabsContent>

        {/* --- PESTAÑA PERSONAL --- */}
        <TabsContent value="usuarios" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {users.map((u) => (
                <Card key={u.id} className="border-none shadow-xl rounded-3xl overflow-hidden group hover:shadow-2xl transition-all">
                   <div className={cn("h-2", u.activo ? "bg-emerald-500" : "bg-slate-300")} />
                   <CardContent className="p-8">
                      <div className="flex justify-between mb-6">
                         <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-emerald-600 group-hover:text-white transition-all text-xl">
                            {u.nombre.substring(0,2).toUpperCase()}
                         </div>
                         <Badge variant={u.activo ? "default" : "secondary"}>
                           {u.rol}
                         </Badge>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 leading-tight">{u.nombre}</h4>
                      <p className="text-sm text-slate-400 font-bold mt-1">{u.email}</p>
                      
                      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <MapPin className="w-3 h-3" /> 
                            {sucursales.find(s => s.id === u.sucursal_id)?.nombre || "Multi-sede"}
                         </div>
                         <div className="flex gap-2">
                           <Button variant="ghost" size="icon" onClick={() => deleteUser(u)} className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                              <Trash2 className="w-4 h-4" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => { setEditingUser(u); setIsUserDialogOpen(true); }} className="h-10 w-10 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                              <Edit2 className="w-4 h-4" />
                           </Button>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              ))}
              <Button 
                onClick={() => { setEditingUser(null); setIsUserDialogOpen(true); }}
                variant="outline"
                className="h-auto min-h-[200px] rounded-3xl border-4 border-dashed border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 flex flex-col gap-4 text-slate-300 hover:text-emerald-600 transition-all group"
              >
                <Users className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center px-6">
                   <p className="font-black text-lg uppercase tracking-widest">Añadir Personal</p>
                   <p className="text-[10px] font-black italic opacity-60 uppercase tracking-tight">Crea cajeros o administradores secundarios.</p>
                </div>
              </Button>
           </div>
        </TabsContent>

        {/* --- PESTAÑA BANCOS --- */}
        <TabsContent value="bancos" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="border-none shadow-xl rounded-3xl overflow-hidden hover:shadow-2xl transition-all">
                  <div className={cn("h-2", account.activo ? "bg-emerald-500" : "bg-slate-300")} />
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <Badge variant={account.activo ? "default" : "secondary"}>
                        {account.activo ? "Activo" : "Pausado"}
                      </Badge>
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">{account.nombre_banco}</h4>
                    <p className="text-emerald-600 font-mono text-lg font-black mt-1 tracking-tighter">{account.numero_cuenta}</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titular</p>
                       <p className="text-sm font-bold text-slate-600">{account.titular || "Cualquier persona"}</p>
                    </div>
                    
                    <div className="mt-8 flex justify-end gap-3">
                       <Button variant="ghost" size="icon" onClick={() => deleteBank(account.id)} className="h-12 w-12 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></Button>
                       <Button variant="ghost" size="icon" onClick={() => { setEditingBank(account); setIsBankDialogOpen(true); }} className="h-12 w-12 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"><Edit2 className="w-5 h-5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button 
                onClick={() => { setEditingBank(null); setIsBankDialogOpen(true); }}
                variant="outline"
                className="h-auto min-h-[220px] rounded-3xl border-4 border-dashed border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 flex flex-col gap-4 text-slate-300 hover:text-emerald-600 transition-all group"
              >
                <Plus className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center px-6">
                   <p className="font-black text-lg uppercase tracking-widest">Nueva Cuenta</p>
                   <p className="text-[10px] font-black italic opacity-60 uppercase tracking-tight">Para transferencias y pagos directos.</p>
                </div>
              </Button>
           </div>
        </TabsContent>

        {/* --- PESTAÑA FACTURACIÓN (DIAN) --- */}
        <TabsContent value="facturacion" className="space-y-6">
           <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-rose-50/50 border-b border-rose-100 p-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-100">
                       <Receipt className="w-8 h-8" />
                    </div>
                    <div>
                       <CardTitle className="text-2xl font-black text-slate-800">Resoluciones DIAN</CardTitle>
                       <CardDescription className="text-slate-500 font-medium">Configuración de facturación electrónica y POS legal en Colombia.</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                 <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                       <p className="font-black text-amber-900 leading-tight">MÓDULO DE CUMPLIMIENTO LEGAL ACTIVO</p>
                       <p className="text-amber-800 text-sm mt-1 font-medium">Asegúrese de que los rangos de facturación coincidan exactamente con el archivo .XML de la DIAN.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <div className="space-y-3">
                       <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Número de Resolución</Label>
                       <Input 
                          value={tenantData?.configuracion_pos?.resolucion_numero || ""}
                          onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, resolucion_numero: e.target.value}})}
                          placeholder="Ej. 18760000001" 
                          className="h-14 border-slate-200 focus:ring-rose-500 rounded-2xl font-bold"
                       />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Prefijo</Label>
                       <Input 
                          value={tenantData?.configuracion_pos?.resolucion_prefijo || ""}
                          onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, resolucion_prefijo: e.target.value}})}
                          placeholder="Ej. SETT" 
                          className="h-14 border-slate-200 focus:ring-rose-500 rounded-2xl font-black text-center"
                       />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Fecha de Vencimiento</Label>
                       <Input 
                          type="date"
                          value={tenantData?.configuracion_pos?.resolucion_fecha_fin || ""}
                          onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, resolucion_fecha_fin: e.target.value}})}
                          className="h-14 border-slate-200 focus:ring-rose-500 rounded-2xl font-bold"
                       />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Desde el número</Label>
                       <Input 
                          type="number"
                          value={tenantData?.configuracion_pos?.resolucion_desde || ""}
                          onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, resolucion_desde: e.target.value}})}
                          className="h-14 border-slate-200 focus:ring-rose-500 rounded-2xl font-black text-emerald-600"
                       />
                    </div>
                    <div className="space-y-3">
                       <Label className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Hasta el número</Label>
                       <Input 
                          type="number"
                          value={tenantData?.configuracion_pos?.resolucion_hasta || ""}
                          onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, resolucion_hasta: e.target.value}})}
                          className="h-14 border-slate-200 focus:ring-rose-500 rounded-2xl font-black text-rose-600"
                       />
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                       <p className="font-black text-slate-800">Régimen Simple / Ordinario</p>
                       <p className="text-sm text-slate-500 font-medium">Configure si su empresa es responsable de IVA.</p>
                    </div>
                    <div className="flex gap-4">
                       <Button variant="outline" className="h-12 border-slate-200 rounded-xl font-bold">No Responsable</Button>
                       <Button className="h-12 bg-rose-600 text-white rounded-xl font-bold">Responsable de IVA</Button>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="recibo" className="space-y-6">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 space-y-6">
                 <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                       <CardTitle className="text-2xl font-black text-slate-800">Personalización de Recibo</CardTitle>
                       <CardDescription className="text-slate-500 font-medium tracking-tight">Configure los textos y el diseño de su ticket térmico de 80mm / 58mm.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                       <div className="space-y-4">
                          <Label className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Mensaje de Cabecera (Opcional)</Label>
                          <Input 
                            value={tenantData?.configuracion_pos?.ticket_header || ""} 
                            onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, ticket_header: e.target.value}})}
                            placeholder="Ej. ¡Gracias por preferir lo natural!" 
                            className="h-12 border-slate-200 rounded-xl font-bold"
                          />
                       </div>
                       
                       <div className="space-y-4">
                          <Label className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Pie de Página / Términos</Label>
                          <textarea 
                            value={tenantData?.configuracion_pos?.ticket_footer || ""} 
                            onChange={(e) => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, ticket_footer: e.target.value}})}
                            rows={4}
                            placeholder="Ej. No se aceptan devoluciones de productos destapados. Conserve su factura." 
                            className="w-full p-4 border border-slate-200 rounded-2xl font-medium text-sm focus:ring-emerald-500 bg-white"
                          />
                       </div>

                       <div className="pt-6 border-t border-slate-50 space-y-6">
                          <div className="flex items-center justify-between">
                             <div>
                                <p className="font-black text-slate-800">Impresión Automática</p>
                                <p className="text-xs text-slate-500 font-semibold tracking-tight">Activar para imprimir al cerrar cada venta.</p>
                             </div>
                             <div className={cn("w-14 h-8 rounded-full p-1 cursor-pointer transition-all", tenantData?.configuracion_pos?.print_auto ? "bg-emerald-500" : "bg-slate-200")}
                                onClick={() => setTenantData({...tenantData, configuracion_pos: {...tenantData.configuracion_pos, print_auto: !tenantData.configuracion_pos?.print_auto}})}
                             >
                                <div className={cn("w-6 h-6 bg-white rounded-full shadow-md transition-all", tenantData?.configuracion_pos?.print_auto ? "translate-x-6" : "translate-x-0")} />
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </div>

              <div className="lg:col-span-5">
                 <div className="sticky top-6 space-y-4">
                    <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Vista Previa Realista</p>
                    <div className="bg-slate-200 p-6 rounded-[2.5rem] shadow-inner">
                       <div className="bg-white p-8 shadow-2xl mx-auto w-full max-w-[280px] font-mono text-[10px] text-slate-800 space-y-4 leading-tight">
                          <div className="text-center space-y-1">
                             {tenantData?.logo_url && <img src={tenantData.logo_url} className="w-12 h-12 mx-auto grayscale opacity-80 mb-2" />}
                             <p className="font-black text-xs uppercase">{tenantData?.nombre_empresa || "VELORA POS"}</p>
                             <p>NIT: {tenantData?.nit || "900.000.000-0"}</p>
                             <p>{tenantData?.direccion_fiscal || "Dirección Principal"}</p>
                             <p>TEL: {tenantData?.telefono || "300 000 0000"}</p>
                          </div>

                          <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[8px] font-bold">
                             {tenantData?.configuracion_pos?.ticket_header || "BIENVENIDOS"}
                          </div>

                          <div className="space-y-1">
                             <div className="flex justify-between">
                                <span>1x Colageno Plus</span>
                                <span>$45.000</span>
                             </div>
                             <div className="flex justify-between">
                                <span>2x Vitamina C 500mg</span>
                                <span>$30.000</span>
                             </div>
                          </div>

                          <div className="border-t border-slate-800 pt-2 space-y-1">
                             <div className="flex justify-between font-black text-xs">
                                <span>TOTAL</span>
                                <span>$75.000</span>
                             </div>
                             <div className="flex justify-between text-[8px]">
                                <span>EFECTIVO</span>
                                <span>$80.000</span>
                             </div>
                             <div className="flex justify-between text-[8px]">
                                <span>CAMBIO</span>
                                <span>$5.000</span>
                             </div>
                          </div>

                          <div className="text-center pt-4 space-y-2 opacity-60">
                             <p className="italic">{tenantData?.configuracion_pos?.ticket_footer || "Gracias por su compra"}</p>
                             <p className="text-[7px]">Desarrollado por Velora POS</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </TabsContent>
        </div>
      </Tabs>

      {/* --- DIALOGOS MODALES --- */}

      {/* Modal Bancos */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
         <DialogContent className="max-w-xl rounded-3xl border-none shadow-2xl p-0 bg-white">
            <form onSubmit={handleSaveBank}>
               <div className="p-10 space-y-8 text-slate-900">
                  <DialogHeader>
                     <DialogTitle className="text-3xl font-black text-slate-800 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                           <Building2 className="w-6 h-6" />
                        </div>
                        {editingBank ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}
                     </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Nombre del Banco</Label>
                        <Input name="nombre_banco" defaultValue={editingBank?.nombre_banco} placeholder="Ej. Bancolombia" className="h-14 border-slate-200 rounded-2xl font-bold text-lg" required />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Número de Cuenta</Label>
                        <Input name="numero_cuenta" defaultValue={editingBank?.numero_cuenta} placeholder="000-000000-00" className="h-14 border-slate-200 rounded-2xl font-mono text-xl" required />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Titular / Razón Social</Label>
                        <Input name="titular" defaultValue={editingBank?.titular} placeholder="Juan Pérez" className="h-14 border-slate-200 rounded-2xl font-bold" />
                     </div>
                  </div>
                  <DialogFooter className="pt-4 border-t border-slate-50">
                     <Button type="button" variant="outline" onClick={() => setIsBankDialogOpen(false)} className="h-12 px-8 rounded-xl font-bold">Cancelar</Button>
                     <Button type="submit" className="h-12 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">Guardar Cuenta</Button>
                  </DialogFooter>
               </div>
            </form>
         </DialogContent>
      </Dialog>

      {/* Modal Sedes (Sucursales) */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
         <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 bg-white">
            <form onSubmit={handleSaveBranch}>
               <div className="p-10 space-y-8 text-slate-900">
                  <DialogHeader>
                     <DialogTitle className="text-3xl font-black text-slate-800 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                           <MapPin className="w-6 h-6" />
                        </div>
                        {editingBranch ? "Editar Sede" : "Registrar Nueva Sede"}
                     </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2 col-span-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Nombre Comercial Sede</Label>
                        <Input name="nombre" defaultValue={editingBranch?.nombre} placeholder="Ej. Velora Norte" className="h-14 border-slate-200 rounded-2xl font-bold text-lg" required />
                     </div>
                     <div className="space-y-2 col-span-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Dirección Exacta</Label>
                        <Input name="direccion" defaultValue={editingBranch?.direccion} placeholder="Calle 45 # 23-11" className="h-14 border-slate-200 rounded-2xl font-bold" required />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Teléfono Sede</Label>
                        <Input name="telefono" defaultValue={editingBranch?.telefono} placeholder="604 123 4567" className="h-14 border-slate-200 rounded-2xl font-bold" />
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Ciudad</Label>
                        <Input name="ciudad" defaultValue={editingBranch?.ciudad} placeholder="Pereira" className="h-14 border-slate-200 rounded-2xl font-bold" />
                     </div>
                  </div>
                  <DialogFooter className="pt-6 border-t border-slate-50">
                     <Button type="button" variant="outline" onClick={() => setIsBranchDialogOpen(false)} className="h-12 px-8 rounded-xl font-bold">Cancelar</Button>
                     <Button type="submit" className="h-12 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">Activar Sede</Button>
                  </DialogFooter>
               </div>
            </form>
         </DialogContent>
      </Dialog>
      {/* Modal Personal (Usuarios) */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
         <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 bg-white">
            <form onSubmit={handleSaveUser}>
               <div className="p-10 space-y-8 text-slate-900">
                  <DialogHeader>
                     <DialogTitle className="text-3xl font-black text-slate-800 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                           <Users className="w-6 h-6" />
                        </div>
                        {editingUser ? "Editar Usuario" : "Nuevo Miembro del Equipo"}
                     </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2 col-span-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Nombre Completo</Label>
                        <Input name="nombre" defaultValue={editingUser?.nombre} placeholder="Ej. Carlos Vives" className="h-14 border-slate-200 rounded-2xl font-bold text-lg" required />
                     </div>
                     <div className="space-y-2 col-span-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Email Corporativo</Label>
                        <Input name="email" type="email" defaultValue={editingUser?.email} placeholder="carlos@empresa.com" className="h-14 border-slate-200 rounded-2xl font-bold" required />
                     </div>
                     <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Contraseña {editingUser && <span className="text-[9px] lowercase opacity-50">(dejar vacío para no cambiar)</span>}</Label>
                        <Input name="password" type="password" placeholder="Contraseña segura" className="h-14 border-slate-200 rounded-2xl font-bold" required={!editingUser} />
                     </div>
                     <div className="space-y-2 col-span-2 md:col-span-1">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Estado del Sistema</Label>
                        <select name="activo" defaultValue={editingUser ? String(editingUser.activo) : 'true'} className="w-full h-14 px-4 border border-slate-200 rounded-2xl font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                           <option value="true">Activo</option>
                           <option value="false">Desactivado temporalmente</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Rol asignado</Label>
                        <select name="rol" defaultValue={editingUser?.rol} className="w-full h-14 px-4 border border-slate-200 rounded-2xl font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                           <option value="cajero">Cajero (Ventas)</option>
                           <option value="admin">Administrador (Control Total)</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Sede de Trabajo</Label>
                        <select name="sucursal_id" defaultValue={editingUser?.sucursal_id} className="w-full h-14 px-4 border border-slate-200 rounded-2xl font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                           {sucursales.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                           ))}
                        </select>
                     </div>
                  </div>
                  <DialogFooter className="pt-6 border-t border-slate-50">
                     <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)} className="h-12 px-8 rounded-xl font-bold">Descartar</Button>
                     <Button type="submit" className="h-12 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">{editingUser ? "Guardar Cambios" : "Crear Usuario"}</Button>
                  </DialogFooter>
               </div>
            </form>
         </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponente simple para Badge
function Badge({ children, variant = "default", className = "" }: any) {
  const variants: any = {
    default: "bg-emerald-100 text-emerald-700 border-emerald-200",
    secondary: "bg-slate-100 text-slate-600 border-slate-200"
  };
  return (
    <span className={cn("px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-widest shadow-sm", variants[variant], className)}>
      {children}
    </span>
  );
}
