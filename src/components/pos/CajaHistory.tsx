"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calculator,
  Search,
  CheckCircle2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";

interface CajaHistoryProps {
  tenantId: string;
  isAdmin: boolean;
  userId: string;
  onBack: () => void;
}

export function CajaHistory({ tenantId, isAdmin, userId, onBack }: CajaHistoryProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoves, setLoadingMoves] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, [tenantId, isAdmin, userId]);

  const fetchSessions = async () => {
     setLoading(true);
      let query = supabase
        .from('sesiones_caja' as any)
        .select(`
           *,
           usuarios ( nombre, email )
        `)
        .eq('tenant_id', tenantId)
        .order('hora_apertura', { ascending: false });

     // Si no es admin, solo ve su propio historial
     if (!isAdmin) {
        query = query.filter('usuario_id', 'eq', userId);
     }

     const { data, error } = await query;
     
     if (data) {
        setSessions(data);
     }
     setLoading(false);
  };

  const fetchMovements = async (sessionId: string) => {
     setLoadingMoves(true);
     const { data } = await supabase
        .from('caja_movimientos')
        .select('*')
        .eq('sesion_id', sessionId)
        .order('fecha', { ascending: false });
     
     if (data) {
        setMovements(data);
     }
     setLoadingMoves(false);
  };

  const handleSelectSession = (sess: any) => {
     setSelectedSession(sess);
     fetchMovements(sess.id);
  };

  if (loading) {
     return <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Cargando reportes de caja...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
       {/* PANEL IZQUIERDO: Lista de Sesiones */}
       <Card className="col-span-1 border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col h-[800px]">
          <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/50">
             <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-xl font-black text-slate-800">Historial de Turnos</CardTitle>
                <Button variant="outline" size="sm" onClick={onBack} className="rounded-xl border-slate-200 text-slate-500 font-bold">Volver</Button>
             </div>
             {(isAdmin) && (
                <div className="text-xs font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-100 flex gap-2">
                   <AlertTriangle className="w-4 h-4 text-amber-500" /> Vista Administrador (Todos los cajeros)
                </div>
             )}
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
             <div className="space-y-3">
                {sessions.map((sess) => (
                   <div 
                      key={sess.id}
                      onClick={() => handleSelectSession(sess)}
                      className={cn(
                         "p-5 rounded-2xl cursor-pointer transition-all border group",
                         selectedSession?.id === sess.id 
                            ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
                            : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md"
                      )}
                   >
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-2">
                            <Badge className={cn(
                               "border-0 text-[9px] font-black px-2 uppercase tracking-widest",
                               sess.estado === 'abierta' 
                                  ? (selectedSession?.id === sess.id ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                                  : (selectedSession?.id === sess.id ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")
                            )}>
                               {sess.estado}
                            </Badge>
                         </div>
                         <span className={cn(
                            "text-[10px] font-bold",
                            selectedSession?.id === sess.id ? "text-slate-400" : "text-slate-400"
                         )}>
                            {new Date(sess.hora_apertura).toLocaleDateString()}
                         </span>
                      </div>
                      
                      {isAdmin && (
                         <div className="flex items-center gap-2 mb-2">
                            <User className={cn("w-4 h-4", selectedSession?.id === sess.id ? "text-slate-400" : "text-slate-400")} />
                            <span className={cn(
                               "text-sm font-bold truncate",
                               selectedSession?.id === sess.id ? "text-slate-200" : "text-slate-700"
                            )}>{sess.usuarios?.nombre || sess.usuarios?.email || 'Usuario Desconocido'}</span>
                         </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-4">
                         <div className={cn(
                            "p-2 rounded-xl border",
                            selectedSession?.id === sess.id ? "bg-white/10 border-white/5" : "bg-slate-50 border-slate-100"
                         )}>
                            <p className="text-[9px] uppercase tracking-widest opacity-60 font-black mb-1">Apertura</p>
                            <p className="font-bold text-sm truncate">{formatCurrency(sess.monto_inicial)}</p>
                         </div>
                         <div className={cn(
                            "p-2 rounded-xl border",
                            selectedSession?.id === sess.id ? "bg-white/10 border-white/5" : "bg-slate-50 border-slate-100"
                         )}>
                            <p className="text-[9px] uppercase tracking-widest opacity-60 font-black mb-1">Cierre</p>
                            <p className="font-bold text-sm truncate">{sess.monto_final !== null ? formatCurrency(sess.monto_final) : '---'}</p>
                         </div>
                      </div>

                      {sess.estado === 'cerrada' && sess.diferencia !== 0 && (
                         <div className={cn(
                            "mt-3 p-2 rounded-xl flex items-center justify-between",
                            sess.diferencia < 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-600",
                            selectedSession?.id === sess.id && sess.diferencia < 0 ? "bg-rose-500/20 text-rose-400" : "",
                            selectedSession?.id === sess.id && sess.diferencia > 0 ? "bg-emerald-500/20 text-emerald-400" : ""
                         )}>
                            <div className="flex items-center gap-1.5">
                               <AlertTriangle className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-black uppercase tracking-wider">
                                  {sess.diferencia < 0 ? 'Faltante' : 'Sobrante'}
                               </span>
                            </div>
                            <span className="font-black text-xs">{formatCurrency(sess.diferencia)}</span>
                         </div>
                      )}
                   </div>
                ))}
                {sessions.length === 0 && (
                   <div className="py-10 text-center text-slate-400 font-bold">No hay turnos registrados.</div>
                )}
             </div>
          </ScrollArea>
       </Card>

       {/* PANEL DERECHO: Detalle de la Sesión */}
       <Card className="col-span-1 lg:col-span-2 border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white flex flex-col h-[800px]">
          {selectedSession ? (
             <>
                <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                   <div className="flex justify-between items-start mb-6">
                      <div>
                         <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Reporte del Turno</h3>
                         <p className="text-sm font-bold text-slate-500 flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" />
                            {new Date(selectedSession.hora_apertura).toLocaleString()} 
                            {selectedSession.hora_cierre && `  →  ${new Date(selectedSession.hora_cierre).toLocaleTimeString()}`}
                         </p>
                      </div>
                      <Badge className={cn("text-xs font-black uppercase tracking-widest px-3 py-1.5", selectedSession.estado === 'abierta' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                         {selectedSession.estado === 'abierta' ? 'Turno en Curso' : 'Turno Finalizado'}
                      </Badge>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Inicial</p>
                         <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(selectedSession.monto_inicial)}</p>
                      </div>
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efectivo (+Base)</p>
                         <p className="text-xl font-black text-emerald-600 mt-1">
                            {formatCurrency(selectedSession.monto_inicial + movements.filter(m => m.tipo === 'venta' && m.metodo_pago === 'efectivo').reduce((acc, m) => acc + m.monto, 0))}
                         </p>
                      </div>
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Tarjeta</p>
                         <p className="text-xl font-black text-blue-600 mt-1">
                            {formatCurrency(movements.filter(m => m.tipo === 'venta' && m.metodo_pago === 'tarjeta').reduce((acc, m) => acc + m.monto, 0))}
                         </p>
                      </div>
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Transf.</p>
                         <p className="text-xl font-black text-indigo-600 mt-1">
                            {formatCurrency(movements.filter(m => m.tipo === 'venta' && m.metodo_pago === 'transferencia').reduce((acc, m) => acc + m.monto, 0))}
                         </p>
                      </div>
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Esperado</p>
                         <p className="text-xl font-black text-slate-800 mt-1">
                            {formatCurrency(selectedSession.monto_esperado || (selectedSession.monto_inicial + movements.filter(m => m.tipo === 'venta' && m.metodo_pago === 'efectivo').reduce((acc, m) => acc + m.monto, 0)) )}
                         </p>
                      </div>
                      <div className={cn(
                         "p-4 rounded-2xl border shadow-sm",
                         selectedSession.estado === 'cerrada' 
                            ? (selectedSession.diferencia < 0 ? "bg-rose-50 border-rose-100" : selectedSession.diferencia > 0 ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100")
                            : "bg-slate-50 border-slate-100"
                      )}>
                         <p className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            selectedSession.estado === 'cerrada' 
                               ? (selectedSession.diferencia < 0 ? "text-rose-600" : selectedSession.diferencia > 0 ? "text-amber-600" : "text-emerald-600")
                               : "text-slate-400"
                         )}>
                            Recuento Físico
                         </p>
                         <p className={cn(
                            "text-xl font-black mt-1",
                            selectedSession.estado === 'cerrada' 
                               ? (selectedSession.diferencia < 0 ? "text-rose-700" : selectedSession.diferencia > 0 ? "text-amber-700" : "text-emerald-700")
                               : "text-slate-800"
                         )}>
                            {selectedSession.monto_final !== null ? formatCurrency(selectedSession.monto_final) : 'No auditado'}
                         </p>
                      </div>
                   </div>

                   {/* Observaciones destacadas si hay diferencia */}
                   {selectedSession.diferencia !== 0 && selectedSession.estado === 'cerrada' && (
                      <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4 mt-4">
                         <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                         </div>
                         <div>
                            <h4 className="font-black text-rose-800 text-sm tracking-tight mb-1">
                               Diferencia detectada de {formatCurrency(selectedSession.diferencia)}
                            </h4>
                            <p className="text-sm font-medium text-rose-700/80 italic">
                               "{selectedSession.observaciones || 'Cajero no dejó justificación.'}"
                            </p>
                         </div>
                      </div>
                   )}
                </div>

                <ScrollArea className="flex-1 p-0">
                   {loadingMoves ? (
                      <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Cargando movimientos sincronizados...</div>
                   ) : movements.length === 0 ? (
                      <div className="py-20 text-center">
                         <Calculator className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                         <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sin transacciones</p>
                      </div>
                   ) : (
                      <div className="divide-y divide-slate-50">
                         {movements.map((move) => (
                            <div key={move.id} className="p-6 md:px-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                               <div className="flex items-center gap-5">
                                  <div className={cn(
                                     "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                                     move.tipo === 'ingreso' || move.tipo === 'venta' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                  )}>
                                     {move.tipo === 'ingreso' || move.tipo === 'venta' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                  </div>
                                  <div>
                                     <p className="font-black text-slate-800 leading-none mb-1 group-hover:text-emerald-700 transition-colors uppercase text-[13px] tracking-tight">{move.descripcion}</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> {new Date(move.fecha).toLocaleTimeString()} 
                                        {move.metodo_pago && <><span className="opacity-50">•</span> {move.metodo_pago}</>}
                                     </p>
                                  </div>
                               </div>
                               <span className={cn(
                                  "text-lg font-black tracking-tighter",
                                  move.tipo === 'ingreso' || move.tipo === 'venta' ? "text-emerald-600" : "text-rose-600"
                               )}>
                                  {move.tipo === 'ingreso' || move.tipo === 'venta' ? '+' : '-'}{formatCurrency(move.monto)}
                               </span>
                            </div>
                         ))}
                      </div>
                   )}
                </ScrollArea>
             </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                   <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-400 tracking-tight">Seleccione un Turno</h3>
                <p className="text-slate-400 font-medium max-w-sm mt-2">Haga clic en un reporte de la lista de la izquierda para ver el detalle de cada movimiento transaccional.</p>
             </div>
          )}
       </Card>
    </div>
  );
}
