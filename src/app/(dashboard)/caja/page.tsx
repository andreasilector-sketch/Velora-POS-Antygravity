"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  LogIn, LogOut, CheckCircle2, AlertCircle, Banknote, Clock,
  Calculator, History, Receipt, ArrowRight, TrendingDown,
  TrendingUp, CreditCard, Smartphone, DollarSign, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DenominationCounter } from "@/components/pos/DenominationCounter";
import { CajaHistory } from "@/components/pos/CajaHistory";

// ─── Payment Method Icon ────────────────────────────────────────────────────
function PayIcon({ method }: { method: string }) {
  if (method === "tarjeta") return <CreditCard className="w-4 h-4" />;
  if (method === "transferencia") return <Smartphone className="w-4 h-4" />;
  return <Banknote className="w-4 h-4" />;
}

// ─── Summary pill ───────────────────────────────────────────────────────────
function MethodSummary({
  label, amount, icon, color,
}: { label: string; amount: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn("rounded-2xl p-5 border-2 flex flex-col gap-2", color)}>
      <div className="flex items-center gap-2 opacity-70">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-2xl font-black tracking-tighter">{formatCurrency(amount)}</p>
    </div>
  );
}

export default function CajaPage() {
  const { tenant, profile, loading: fetchingProfile } = useUserProfile();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [openBreakdown, setOpenBreakdown] = useState<Record<number, number>>({});
  const [closeBreakdown, setCloseBreakdown] = useState<Record<number, number>>({});
  const [observations, setObservations] = useState("");
  const [view, setView] = useState<"status" | "opening" | "closing" | "history">("status");
  const [movements, setMovements] = useState<any[]>([]);

  const supabase = createClient();

  // ─── Fetch session + movements ───────────────────────────────────────────
  const fetchActiveSession = useCallback(async () => {
    if (!profile?.id || !tenant?.id) return;
    setLoading(true);
    try {
      const { data: sessionData } = await (supabase.from("sesiones_caja" as any) as any)
        .select("*")
        .eq("usuario_id", profile.id)
        .eq("estado", "abierta")
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData);
        await fetchMovements(sessionData.id);
      } else {
        setSession(null);
        setMovements([]);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.id, tenant?.id]);

  const fetchMovements = async (sesionId: string) => {
    const { data } = await (supabase.from("caja_movimientos" as any) as any)
      .select("*")
      .eq("sesion_id", sesionId)
      .order("fecha", { ascending: false });
    setMovements(data || []);
  };

  // ─── Supabase Realtime for caja_movimientos ──────────────────────────────
  useEffect(() => {
    if (!tenant || !profile) return;
    fetchActiveSession();
  }, [tenant, profile]);

  // Subscribe to realtime once we have a session
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`caja-mov-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "caja_movimientos",
          filter: `sesion_id=eq.${session.id}`,
        },
        (payload) => {
          // Prepend new movement
          setMovements((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  // ─── Computed values ────────────────────────────────────────────────────
  const cashMovements  = movements.filter((m) => m.metodo_pago === "efectivo" && m.tipo === "venta");
  const cardMovements  = movements.filter((m) => m.metodo_pago === "tarjeta"  && m.tipo === "venta");
  const transMovements = movements.filter((m) => m.metodo_pago === "transferencia" && m.tipo === "venta");
  const otherMovements = movements.filter((m) => m.tipo !== "venta");

  const sumOf = (arr: any[]) => arr.reduce((a, m) => a + Number(m.monto), 0);

  const totalCash         = sumOf(cashMovements);
  const totalCard         = sumOf(cardMovements);
  const totalTransfer     = sumOf(transMovements);
  const totalOther        = movements.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0)
                          - movements.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
  const baseApertura      = Number(session?.monto_inicial || 0);
  const expectedCash      = baseApertura + totalCash + totalOther;   // Only cash matters for arqueo físico
  const totalVentas       = totalCash + totalCard + totalTransfer;

  const currentCount = Object.entries(closeBreakdown).reduce(
    (acc, [val, qty]) => acc + Number(val) * qty, 0
  );
  const difference = currentCount - expectedCash;

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleOpenCaja = async () => {
    if (!profile || !tenant) return;
    setActionLoading(true);
    try {
      if (!profile.sucursal_id) throw new Error("No tienes sucursal asignada.");
      const { data: caja } = await supabase
        .from("cajas")
        .select("id")
        .eq("sucursal_id", profile.sucursal_id)
        .limit(1)
        .single();
      if (!caja) throw new Error("No hay cajas configuradas para esta sucursal.");

      const initialTotal = Object.entries(openBreakdown).reduce(
        (acc, [val, qty]) => acc + Number(val) * qty, 0
      );
      const { data, error } = await supabase
        .from("sesiones_caja" as any)
        .insert({
          caja_id: caja.id,
          usuario_id: profile.id,
          tenant_id: tenant.id,
          monto_inicial: initialTotal,
          desglose_efectivo: openBreakdown,
          estado: "abierta",
        })
        .select()
        .single();
      if (error) throw error;

      setSession(data);
      setOpenBreakdown({});
      setView("status");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseCaja = async () => {
    if (!session) return;
    setActionLoading(true);
    if (Math.abs(difference) > 0 && !observations.trim()) {
      alert("Hay una diferencia. Por favor escriba una observación.");
      setActionLoading(false);
      return;
    }
    try {
      const { error } = await supabase
        .from("sesiones_caja" as any)
        .update({
          estado: "cerrada",
          hora_cierre: new Date().toISOString(),
          monto_final: currentCount,
          monto_esperado: expectedCash,
          diferencia: difference,
          desglose_efectivo: closeBreakdown,
          observaciones: observations,
        })
        .eq("id", session.id);
      if (error) throw error;
      setSession(null);
      setCloseBreakdown({});
      setObservations("");
      setView("status");
    } catch (err: any) {
      alert("Error al cerrar: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (fetchingProfile || (loading && tenant)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Cargando sesión...</p>
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="font-sans pb-20 max-w-[1400px] mx-auto">
        <CajaHistory
          tenantId={tenant?.id || ""}
          isAdmin={profile?.rol === "admin" || profile?.rol === "superadmin"}
          userId={profile?.id || ""}
          onBack={() => setView("status")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-2 font-black uppercase tracking-[0.2em] text-[10px]">
            Accounting &amp; Cash
          </Badge>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Caja y Turnos</h2>
          <p className="text-slate-500 font-medium">Control total de flujo de efectivo y arqueos.</p>
        </div>
        <div className="flex gap-2">
          {session && (
            <Button
              variant="outline"
              onClick={fetchActiveSession}
              className="border-slate-200 text-slate-600 font-bold px-5 h-12 rounded-2xl flex gap-2 hover:bg-slate-100"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setView("history")}
            className="border-slate-200 text-slate-600 font-bold px-6 h-12 rounded-2xl flex gap-2 hover:bg-slate-100"
          >
            <History className="w-5 h-5" /> Historial y Reportes
          </Button>
        </div>
      </div>

      {/* ── OPENING VIEW ─────────────────────────────────────────────── */}
      {view === "opening" && !session && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-2xl rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="bg-emerald-600 p-6 lg:p-10 text-white flex flex-col justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 lg:mb-6">
                    <LogIn className="w-6 h-6 lg:w-8 lg:h-8" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black leading-tight tracking-tighter mb-2 lg:mb-4">
                    Declarar Base <br />de Apertura
                  </h3>
                  <p className="text-emerald-100 font-medium text-sm leading-relaxed">
                    Cuenta el efectivo inicial. Este fondo es la base para tu operación diaria.
                  </p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl backdrop-blur-sm border border-white/10 relative z-10 mt-8">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Empresa</p>
                  <p className="text-sm font-bold truncate tracking-tight">{tenant?.nombre_empresa}</p>
                </div>
                <Banknote className="absolute -right-8 -bottom-8 lg:-right-12 lg:-bottom-12 w-48 h-48 lg:w-64 lg:h-64 opacity-10 rotate-12" />
              </div>
              <div className="md:col-span-2 p-6 lg:p-10 space-y-6 lg:space-y-8">
                <DenominationCounter values={openBreakdown} onChange={setOpenBreakdown} />
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setView("status")} className="h-12 lg:h-14 px-6 lg:px-8 font-bold text-slate-400">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleOpenCaja}
                    disabled={actionLoading || Object.keys(openBreakdown).length === 0}
                    className="h-12 lg:h-14 px-8 lg:px-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-base lg:text-lg font-black shadow-xl shadow-emerald-100 flex gap-2 lg:gap-3"
                  >
                    {actionLoading ? "Abriendo..." : <><CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6" /> INICIAR TURNO</>}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── STATUS VIEW ─────────────────────────────────────────────── */}
      {view === "status" && (
        <div className="space-y-8">
          {!session ? (
            <Card className="border-none shadow-2xl rounded-[2rem] lg:rounded-[3rem] overflow-hidden bg-slate-900 group">
              <div className="p-8 lg:p-16 text-center space-y-6 lg:space-y-8 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 bg-amber-500 text-white rounded-2xl lg:rounded-[2rem] flex items-center justify-center mx-auto mb-6 lg:mb-8 shadow-2xl rotate-3 group-hover:rotate-6 transition-all duration-500">
                    <AlertCircle className="w-10 h-10 lg:w-12 lg:h-12" />
                  </div>
                  <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter leading-tight">Terminal Inactivo</h2>
                  <p className="text-slate-400 text-lg lg:text-xl max-w-lg mx-auto font-medium mt-4">
                    No hay una sesión de caja abierta. Declare su base de efectivo para comenzar a vender.
                  </p>
                  <div className="pt-8 lg:pt-10 flex justify-center">
                    <Button
                      onClick={() => setView("opening")}
                      className="h-14 lg:h-16 px-10 lg:px-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl lg:rounded-[1.5rem] text-lg lg:text-xl font-black shadow-2xl shadow-emerald-900/40 flex gap-3 lg:gap-4 transition-all hover:scale-105 active:scale-95"
                    >
                      ABRIR CAJA <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </Button>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

              {/* ── Top: Session info + Method breakdown ── */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6">
                {/* Session status card */}
                <Card className="border-none shadow-2xl rounded-[1.5rem] lg:rounded-[2.5rem] bg-emerald-950 text-white overflow-hidden relative">
                  <CardContent className="p-6 lg:p-8 space-y-4 lg:space-y-6 relative z-10">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-emerald-500 text-white border-0 font-black px-3 py-1 lg:px-4 lg:py-1.5 rounded-full text-[9px] lg:text-[10px] tracking-widest">
                        EN LÍNEA
                      </Badge>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Apertura</p>
                      <p className="text-base lg:text-lg font-black tracking-tight">
                        {session.hora_apertura
                          ? new Date(session.hora_apertura).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
                          : new Date(session.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Base de Apertura</p>
                      <p className="text-2xl lg:text-3xl font-black tracking-tighter">{formatCurrency(baseApertura)}</p>
                    </div>
                    <div className="pt-3 lg:pt-4 border-t border-white/10">
                      <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Efectivo Esperado</p>
                      <p className="text-3xl lg:text-4xl font-black tracking-tighter leading-none">{formatCurrency(expectedCash)}</p>
                      <p className="text-[8px] lg:text-[9px] text-emerald-500/60 font-bold mt-1">= Base + Ventas en efectivo</p>
                    </div>
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-600/30 rounded-full blur-[80px]" />
                  </CardContent>
                </Card>

                {/* Method Breakdowns */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MethodSummary
                    label="Efectivo"
                    amount={totalCash}
                    icon={<Banknote className="w-4 h-4" />}
                    color="border-emerald-100 bg-emerald-50 text-emerald-800"
                  />
                  <MethodSummary
                    label="Tarjeta"
                    amount={totalCard}
                    icon={<CreditCard className="w-4 h-4" />}
                    color="border-sky-100 bg-sky-50 text-sky-800"
                  />
                  <MethodSummary
                    label="Transferencia / Digital"
                    amount={totalTransfer}
                    icon={<Smartphone className="w-4 h-4" />}
                    color="border-violet-100 bg-violet-50 text-violet-800"
                  />

                  {/* Total + close button spanning full row */}
                  <div className="sm:col-span-2 rounded-2xl bg-slate-900 text-white p-5 border-2 border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ventas del Turno</p>
                      <p className="text-3xl font-black tracking-tighter">{formatCurrency(totalVentas)}</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-0.5">{movements.filter(m => m.tipo === "venta").length} transacciones</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-slate-700" />
                  </div>

                  <Button
                    onClick={() => setView("closing")}
                    className="sm:col-span-1 h-full min-h-[72px] bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black shadow-xl shadow-rose-100 flex gap-2 text-base"
                  >
                    <LogOut className="w-5 h-5" /> TERMINAR TURNO
                  </Button>
                </div>
              </div>

              {/* ── Movements list ── */}
              <Card className="border-none shadow-xl rounded-[1.5rem] lg:rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-6 lg:p-8 border-b border-slate-50 flex flex-row items-center justify-between text-slate-800">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-50 rounded-2xl lg:rounded-[1.25rem] flex items-center justify-center border border-slate-100 shadow-inner">
                      <Receipt className="w-6 h-6 lg:w-7 lg:h-7 text-slate-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg lg:text-xl font-black tracking-tighter">Movimientos de Sesión</CardTitle>
                      <CardDescription className="text-slate-500 text-xs lg:text-sm font-medium flex items-center gap-1.5">
                        <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sincronización en tiempo real
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 border-0 font-black px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs">
                    {movements.length} mov.
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {movements.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <Calculator className="w-16 h-16 text-slate-100 mx-auto" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sin movimientos aún</p>
                      <p className="text-slate-300 text-sm font-medium">Las ventas del POS se reflejarán aquí automáticamente.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                      {movements.map((move: any) => {
                        const isPositive = move.tipo === "venta" || move.tipo === "ingreso";
                        return (
                          <div key={move.id} className="px-4 lg:px-8 py-4 lg:py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-center gap-3 lg:gap-5 min-w-0">
                              <div className={cn(
                                "w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0",
                                isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                              )}>
                                {isPositive ? <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" /> : <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5" />}
                              </div>
                              <div className="min-w-0 truncate">
                                <p className="font-black text-slate-800 leading-tight truncate group-hover:text-emerald-700 transition-colors text-xs lg:text-sm">
                                  {move.descripcion || "Venta de Productos"}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 lg:gap-2 mt-0.5">
                                  <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                    {new Date(move.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                  <span className={cn(
                                    "flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg",
                                    move.metodo_pago === "efectivo"       ? "bg-emerald-50 text-emerald-700" :
                                    move.metodo_pago === "tarjeta"        ? "bg-sky-50 text-sky-700" :
                                    move.metodo_pago === "transferencia"  ? "bg-violet-50 text-violet-700" :
                                    "bg-slate-100 text-slate-500"
                                  )}>
                                    <PayIcon method={move.metodo_pago || "efectivo"} />
                                    {move.metodo_pago || "efectivo"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "text-xl font-black tracking-tighter flex-shrink-0",
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {isPositive ? "+" : "-"}{formatCurrency(move.monto)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── CLOSING VIEW ──────────────────────────────────────────────── */}
      {view === "closing" && session && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-2xl rounded-[1.5rem] lg:rounded-[3rem] overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Left panel: summary */}
              <div className="bg-rose-600 p-6 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/20 rounded-[1rem] lg:rounded-3xl flex items-center justify-center mb-6 lg:mb-8">
                    <Calculator className="w-8 h-8 lg:w-10 lg:h-10" />
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-black leading-[0.9] tracking-tighter mb-4 lg:mb-6 uppercase">
                    Arqueo <br />de Cierre
                  </h3>
                  <p className="text-rose-100 font-medium text-sm leading-relaxed">
                    Cuente el efectivo físico en su cajón. Cualquier diferencia quedará registrada.
                  </p>
                </div>

                <div className="space-y-3 relative z-10 mt-10">
                  {/* Breakdown */}
                  <div className="p-4 bg-black/10 rounded-2xl border border-white/10 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-200 font-bold text-xs flex items-center gap-1.5"><Banknote className="w-3 h-3" /> Base Apertura</span>
                      <span className="font-black">{formatCurrency(baseApertura)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-rose-200 font-bold text-xs flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Ventas Efectivo</span>
                      <span className="font-black text-emerald-300">+{formatCurrency(totalCash)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-rose-200 font-bold text-xs flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Tarjeta / Digital</span>
                      <span className="font-black text-sky-300">{formatCurrency(totalCard + totalTransfer)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                      <span className="text-white font-black text-xs">TOTAL VENDIDO</span>
                      <span className="font-black text-white">{formatCurrency(totalVentas)}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-black/20 rounded-2xl backdrop-blur-md border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 text-rose-200">Debe Haber en Cajón</p>
                    <p className="text-3xl font-black tracking-tighter">{formatCurrency(expectedCash)}</p>
                    <p className="text-[9px] opacity-50 mt-0.5">Base + ventas en efectivo únicamente</p>
                  </div>

                  <div className={cn(
                    "p-4 lg:p-5 rounded-xl lg:rounded-2xl backdrop-blur-md border transition-all duration-500",
                    Math.abs(difference) < 1 ? "bg-emerald-500/20 border-emerald-400/30" : "bg-white/10 border-white/10"
                  )}>
                    <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Diferencia</p>
                    <p className={cn(
                      "text-2xl lg:text-3xl font-black tracking-tighter leading-none",
                      difference < 0 ? "text-rose-100 animate-pulse" : difference > 0 ? "text-emerald-300" : "text-white"
                    )}>
                      {formatCurrency(difference)}
                    </p>
                    <p className="text-[8px] lg:text-[9px] opacity-50 mt-1">
                      {difference === 0 ? "✅ Caja cuadrada perfectamente" : difference > 0 ? "⚠ Sobrante" : "❌ Faltante"}
                    </p>
                  </div>
                </div>
                <LogOut className="absolute -right-12 -bottom-12 lg:-right-16 lg:-bottom-16 w-56 h-56 lg:w-80 lg:h-80 opacity-10 rotate-12" />
              </div>

              {/* Right panel: denomination counter */}
              <div className="md:col-span-2 p-6 lg:p-10 space-y-6 lg:space-y-8 overflow-y-auto max-h-[90vh]">
                <div>
                  <h4 className="font-black text-slate-800 text-xl lg:text-2xl tracking-tighter mb-1">Conteo de Billetes y Monedas</h4>
                  <p className="text-[10px] lg:text-xs text-slate-400 font-medium">Toca + / - para contar cada denominación</p>
                </div>
                <DenominationCounter values={closeBreakdown} onChange={setCloseBreakdown} />

                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Observaciones Finales
                  </Label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="¿Alguna novedad en el turno? (ej. pagos con cheque, vales, descuadres...)"
                    className="w-full min-h-[120px] p-5 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-rose-200 focus:ring-4 focus:ring-rose-50 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-300 text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setView("status")} className="h-14 lg:h-16 px-6 lg:px-10 font-bold text-slate-400 rounded-2xl hover:bg-slate-50 w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCloseCaja}
                    disabled={actionLoading || currentCount === 0}
                    className="h-14 lg:h-16 px-8 lg:px-16 bg-rose-600 hover:bg-rose-700 text-white rounded-[1.25rem] lg:rounded-[1.5rem] text-lg lg:text-xl font-black shadow-2xl shadow-rose-200 flex gap-3 lg:gap-4 transition-all hover:scale-[1.02] active:scale-95 w-full sm:w-auto"
                  >
                    {actionLoading ? "Procesando..." : <><CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6" /> LIQUIDAR TURNO</>}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
