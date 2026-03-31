"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  Trophy,
  Zap,
  LayoutDashboard,
  Sparkles,
  History,
  Plus,
  Boxes,
  LogOut,
  AlertTriangle,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, normalizeText } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/roles";

export default function DashboardPage() {
  const { tenant, profile, loading } = useUserProfile();
  const router = useRouter();
  const [stats, setStats] = useState({
    salesToday: 0,
    ticketPromedio: 0,
    prodVendidos: 0,
    totalClientes: 0
  });
  const [recentVentas, setRecentVentas] = useState<any[]>([]);
  const [alertItems, setAlertItems] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!tenant) return;
    fetchStats();
    fetchRecentVentas();
    fetchAlerts();

    // ─── Supabase Realtime – escucha INSERT en ventas ───────────────────────
    const channel = supabase
      .channel(`dashboard-ventas-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ventas",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          // Prepend the new sale to the top and keep only 5
          setRecentVentas((prev) => [payload.new, ...prev].slice(0, 5));
          // Refresh KPIs
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant]);

  const fetchAlerts = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("productos" as any) as any)
      .select("id, nombre, stock_actual, stock_minimo")
      .eq("tenant_id", tenant.id)
      .eq("activo", true)
      .gt("stock_minimo", 0);
      
    if (data) {
      const lowStock = data.filter((p: any) => (p.stock_actual || 0) <= p.stock_minimo).slice(0, 5);
      setAlertItems(lowStock);
    }
  };

  const fetchStats = async () => {
    if (!tenant?.id) return;
    const today = new Date().toISOString().split("T")[0];

    const [salesRes, clientsRes] = await Promise.all([
      (supabase.from("ventas" as any) as any)
        .select("total")
        .eq("tenant_id", tenant.id)
        .gte("fecha", today),
      (supabase.from("clientes" as any) as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
    ]);

    const totalSales = salesRes.data?.reduce((acc: number, v: any) => acc + v.total, 0) || 0;
    setStats({
      salesToday: totalSales,
      ticketPromedio: salesRes.data?.length > 0 ? totalSales / salesRes.data.length : 0,
      prodVendidos: salesRes.data?.length || 0,
      totalClientes: clientsRes.count || 0,
    });
  };

  const fetchRecentVentas = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("ventas" as any) as any)
      .select("id, total, fecha, metodo_pago, estado, clientes:cliente_id(nombre)")
      .eq("tenant_id", tenant.id)
      .order("fecha", { ascending: false })
      .limit(5);
    if (data) setRecentVentas(data);
  };

  const isCajero = profile?.rol === ROLES.CAJERO;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Ahora mismo";
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  };

  return (
    <div className="space-y-10 pb-20 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">{isCajero ? "Estación de Trabajo" : "Panel de Control SaaS"}</p>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">Bienvenido, {profile?.nombre.split(' ')[0]}</h2>
          <p className="text-slate-500 font-medium">{isCajero ? "Tu turno está activo. Selecciona una acción para comenzar." : <>Aquí está el rendimiento de <span className="text-emerald-600 font-bold">{tenant?.nombre_empresa}</span> hoy.</>}</p>
        </div>
        {!isCajero && (
          <div className="hidden md:flex gap-4 items-center">
            <div className="relative group">
               <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
               <input 
                  type="text" 
                  placeholder="Buscar producto o cliente..." 
                  className="pl-9 pr-4 h-10 w-64 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      router.push(`/products?q=${encodeURIComponent(val)}`);
                    }
                  }}
               />
            </div>
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-slate-500">Live · Hoy</span>
            </div>
          </div>
        )}
      </div>

      {isCajero ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/pos" className="group">
            <Card className="p-10 border-slate-200 hover:border-emerald-500 hover:shadow-2xl transition-all rounded-[2.5rem] bg-white flex flex-col items-center text-center gap-6 group-hover:-translate-y-2">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Punto de Venta</h3>
                <p className="text-slate-500 font-medium mt-2">Registrar ventas, facturar y gestionar clientes.</p>
              </div>
              <Button className="bg-emerald-600 text-white font-black w-full h-12 rounded-xl">ABRIR POS</Button>
            </Card>
          </Link>

          <Link href="/caja" className="group">
            <Card className="p-10 border-slate-200 hover:border-violet-500 hover:shadow-2xl transition-all rounded-[2.5rem] bg-white flex flex-col items-center text-center gap-6 group-hover:-translate-y-2">
              <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-3xl flex items-center justify-center shadow-lg group-hover:bg-violet-600 group-hover:text-white transition-all">
                <LogOut className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Caja y Turnos</h3>
                <p className="text-slate-500 font-medium mt-2">Apertura, cierre y arqueo de efectivo diario.</p>
              </div>
              <Button className="bg-violet-600 text-white font-black w-full h-12 rounded-xl">GESTIONAR CAJA</Button>
            </Card>
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Ventas de Hoy" amount={formatCurrency(stats.salesToday)} icon={<DollarSign />} trend={`${stats.prodVendidos} transac.`} positive={true} color="emerald" />
            <KPICard title="Ticket Promedio" amount={formatCurrency(stats.ticketPromedio)} icon={<Zap />} trend="Hoy" positive={true} color="violet" />
            <KPICard title="Base de Clientes" amount={stats.totalClientes.toString()} icon={<Users />} trend="Total activos" positive={true} color="amber" />
            <KPICard title="Transacciones Hoy" amount={stats.prodVendidos.toString()} icon={<Trophy />} trend="Ventas completadas" positive={true} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:col-span-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-[450px] flex flex-col relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500" /> Alertas de Inventario
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {alertItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                     <AlertTriangle className="w-12 h-12 text-slate-300" />
                     <p className="text-sm text-slate-500 font-bold italic text-center">Stock en niveles óptimos</p>
                  </div>
                ) : alertItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-5 bg-rose-50/50 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{item.nombre}</p>
                      <p className="text-xs text-slate-500 font-bold mt-1">Mínimo ideal: <span className="text-slate-700">{item.stock_minimo}</span></p>
                    </div>
                    <div className="text-right flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-rose-100/50">
                      <p className="text-3xl font-black text-rose-600">{item.stock_actual}</p>
                      <p className="text-xs font-black uppercase text-rose-400 tracking-wider">Und.</p>
                    </div>
                  </div>
                ))}
              </div>
              {alertItems.length > 0 && (
                <Link href="/inventory/management" className="mt-6">
                  <Button className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black tracking-widest uppercase h-12 rounded-xl border border-rose-100 transition-all">
                    Gestionar Inventario Restante →
                  </Button>
                </Link>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm rounded-3xl bg-white p-8 group">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" /> Historial Reciente
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En vivo
                  </span>
                </h3>
                <div className="space-y-5">
                  {recentVentas.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold italic text-center py-6 opacity-50">Sin ventas registradas hoy</p>
                  ) : recentVentas.map((v: any) => (
                    <TimelineItem
                      key={v.id}
                      title={`Venta #${v.id.substring(0, 8).toUpperCase()}`}
                      subtitle={(v.clientes as any)?.nombre || "Venta General"}
                      time={timeAgo(v.fecha)}
                      amount={formatCurrency(v.total)}
                      method={v.metodo_pago}
                    />
                  ))}
                </div>
                <Link href="/reports/sales">
                  <Button variant="ghost" className="w-full mt-8 font-black text-xs text-emerald-600 tracking-widest uppercase hover:bg-emerald-50">
                    Ver todos los eventos →
                  </Button>
                </Link>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                <Link href="/pos" className="block w-full">
                  <Button className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-1 transition-all rounded-[2rem] shadow-xl shadow-emerald-200 flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl">
                        <ShoppingBag className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-black text-white leading-none tracking-tighter">PUNTO DE VENTA</p>
                        <p className="text-[10px] font-bold text-emerald-100 uppercase mt-1 tracking-widest">Facturar Ahora →</p>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Button className="w-full h-24 bg-slate-900 hover:bg-slate-800 hover:-translate-y-1 transition-all rounded-[2rem] shadow-xl shadow-slate-200 flex items-center justify-between px-8 relative overflow-hidden group">
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/40 group-hover:rotate-12 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-white leading-none tracking-tighter uppercase">Asistente Galáctico</p>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase mt-1 tracking-[0.2em]">Sugerencias de Combos IA</p>
                    </div>
                  </div>
                  <BrainCircuit className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12 group-hover:text-white/10 transition-all" />
                  <div className="relative z-10 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md opacity-50 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPICard({ title, amount, icon, trend, positive, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-600 text-white shadow-emerald-100",
    violet: "bg-violet-600 text-white shadow-violet-100",
    amber: "bg-amber-500 text-white shadow-amber-100",
    rose: "bg-rose-500 text-white shadow-rose-100",
  };
  return (
    <Card className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all hover:-translate-y-1 group">
      <div className="flex justify-between items-start">
        <div className={cn("p-4 rounded-2xl shadow-lg transition-transform group-hover:scale-110", colors[color])}>
          {React.cloneElement(icon, { size: 24, strokeWidth: 3 })}
        </div>
        <div className={cn(
          "flex items-center px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
          positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 h-3 mr-1" />}
          {trend}
        </div>
      </div>
      <div className="mt-8">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{amount}</h3>
      </div>
    </Card>
  );
}

function TimelineItem({ title, subtitle, time, amount, method }: any) {
  const methodColor: Record<string, string> = {
    efectivo: "bg-emerald-50 text-emerald-600",
    tarjeta: "bg-sky-50 text-sky-600",
    transferencia: "bg-violet-50 text-violet-600",
    mixto: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="flex items-start justify-between group cursor-pointer gap-3">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 ring-4 ring-emerald-50" />
        <div>
          <p className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight">{title}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{subtitle}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{time}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="font-black text-sm text-slate-800">{amount}</span>
        {method && (
          <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wide", methodColor[method] || "bg-slate-50 text-slate-500")}>
            {method}
          </span>
        )}
      </div>
    </div>
  );
}
