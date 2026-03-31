"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Globe,
  Database,
  Plus,
  Mail,
  ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ROLES } from "@/lib/roles";
import { TenantForm } from "./components/TenantForm";

export default function SuperadminPage() {
  const { profile, loading: authLoading } = useUserProfile();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profile?.rol === ROLES.SUPERADMIN) {
      fetchTenants();
    }
  }, [profile]);

  async function fetchTenants() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("fecha_creacion", { ascending: false });

    if (data) setTenants(data);
    setLoading(false);
  }

  const toggleTenantStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "activo" ? "suspendido" : "activo";
    const { error } = await supabase
      .from("tenants")
      .update({ estado: newStatus } as any)
      .eq("id", id);

    if (!error) fetchTenants();
  };

  if (authLoading || loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-slate-400 text-xs uppercase tracking-widest animate-pulse">Cargando Infraestructura...</p>
      </div>
    </div>
  );

  if (profile?.rol !== ROLES.SUPERADMIN) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-10">
        <div className="p-6 bg-rose-50 rounded-3xl mb-6 shadow-inner">
          <AlertCircle className="w-16 h-16 text-rose-500" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Acceso de Alta Seguridad</h2>
        <p className="text-slate-500 max-w-md font-medium">Esta sección está reservada exclusivamente para los arquitectos del sistema Velora POS.</p>
        <Button className="mt-8 bg-slate-900 px-8 h-12 rounded-xl font-bold" onClick={() => window.location.href = "/dashboard"}>Volver al Dashboard</Button>
      </div>
    );
  }

  const filteredTenants = tenants.filter(t =>
    t.nombre_empresa.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20 font-sans">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* LÍNEA CORREGIDA CON ESTILO EN LÍNEA PARA FORZAR EL ANCHO */}
        <DialogContent
          className="w-[90vw] h-auto rounded-3xl border-none shadow-2xl p-0 bg-white"
          style={{ maxWidth: '1024px' }}
        >
          <div className="p-10 flex flex-col h-full">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-4xl font-black text-slate-800 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                  <Plus className="w-8 h-8" />
                </div>
                Provisión de Nuevo Inquilino
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-lg">
                Genera un nuevo entorno aislado para un negocio. Esto creará automáticamente la sede principal y el perfil administrativo.
              </DialogDescription>
            </DialogHeader>

            <TenantForm
              onSave={() => {
                setIsDialogOpen(false);
                fetchTenants();
              }}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-100">
              <Globe className="w-5 h-5" />
            </div>
            <p className="text-xs font-black text-purple-600 uppercase tracking-widest">Velora Core Cluster</p>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-slate-900">Panel Superadmin</h2>
          <p className="text-slate-500 font-medium text-lg">Orquestación de infraestructura multi-inquilino y salud del sistema.</p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-slate-900 hover:bg-black text-white font-black px-8 h-14 rounded-2xl shadow-2xl transition-all hover:scale-[1.05] flex gap-3 text-lg"
          >
            <Plus className="w-6 h-6 text-purple-400" /> NUEVO INQUILINO
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Total Empresas"
          val={tenants.length}
          icon={<Building2 className="w-5 h-5" />}
          color="slate"
        />
        <KPICard
          title="Cluster Health"
          val="99.9%"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="purple"
        />
        <KPICard
          title="En Mora / Inactivos"
          val={tenants.filter(t => t.estado !== 'activo').length}
          icon={<AlertCircle className="w-5 h-5" />}
          color="slate-light"
        />
        <KPICard
          title="MRR Proyectado"
          val={formatCurrency(tenants.length * 49000)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple-dark"
        />
      </div>

      <Card className="border-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white border-b-[6px] border-b-purple-600">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50">
          <div className="relative w-full md:w-[28rem]">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Filtro maestro por empresa, email o NIT..."
              className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-purple-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-2xl font-black text-slate-500 hover:bg-white gap-2">
              <Filter className="w-4 h-4" /> Avanzado
            </Button>
            <div className="h-10 w-[1px] bg-slate-200 mx-2" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Infraestructura AWS/Edge</p>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa / Tenant</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nivel Plan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nodos/Sedes</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-12">Orquestación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-purple-50/20 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-100 transition-all border border-slate-200 group-hover:border-purple-500">
                        {tenant.nombre_empresa.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg leading-tight mb-1">{tenant.nombre_empresa}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-tight">
                          <Mail className="w-3 h-3" /> {tenant.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                      tenant.plan === 'premium' ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        tenant.plan === 'enterprise' ? "bg-purple-600 text-white shadow-purple-100 shadow-lg" :
                          "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                      {tenant.plan || 'Básico'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center">
                      <span className="font-black text-slate-700 text-lg">1</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Nodo Principal</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-2 shadow-sm",
                      tenant.estado === 'activo' ? "bg-slate-50 text-slate-700 border border-slate-100" : "bg-purple-50 text-purple-700 border border-purple-100"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", tenant.estado === 'activo' ? "bg-slate-400 animate-pulse" : "bg-purple-500")} />
                      {tenant.estado}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right pr-12">
                    <div className="flex items-center justify-end gap-3 opacity-20 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTenantStatus(tenant.id, tenant.estado)}
                        className={cn(
                          "font-black text-[10px] uppercase h-10 px-4 rounded-xl",
                          tenant.estado === 'activo' ? "text-slate-600 hover:text-white hover:bg-slate-600 shadow-slate-50" : "text-purple-600 hover:text-white hover:bg-purple-600 shadow-purple-50"
                        )}
                      >
                        {tenant.estado === 'activo' ? 'Suspender' : 'Resumir'}
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 border-slate-200 hover:bg-white rounded-xl shadow-sm"><MoreHorizontal className="w-5 h-5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPICard({ title, val, icon, color }: any) {
  const colors: any = {
    slate: "bg-slate-900 border-slate-800 text-white shadow-xl shadow-slate-200",
    purple: "bg-purple-600 border-purple-500 text-white shadow-xl shadow-purple-100",
    amber: "bg-amber-400 border-amber-300 text-white shadow-xl shadow-amber-100",
    "purple-dark": "bg-purple-950 border-purple-900 text-white shadow-xl shadow-purple-200/50",
    "slate-light": "bg-slate-100 border-slate-200 text-slate-800",
  };

  return (
    <Card className={cn("p-7 rounded-[2.5rem] shadow-2xl border flex flex-col justify-between h-40 group hover:scale-[1.05] transition-all relative overflow-hidden", colors[color])}>
      <div className="flex justify-between items-start relative z-10">
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
          {icon}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Global Cluster</div>
      </div>
      <div className="relative z-10">
        <h4 className="text-4xl font-black tracking-tighter line-clamp-1">{val}</h4>
        <p className="text-[10px] uppercase font-black tracking-widest opacity-60 mt-1">{title}</p>
      </div>
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
    </Card>
  );
}