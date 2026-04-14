"use client";

import React, { useEffect, useState, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Calendar, User, ShoppingBag, Eye, Download, Filter, 
  ArrowUpRight, Clock, UserCheck, RefreshCw, DollarSign, Wallet, UserPlus, Check, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Venta = {
  id: string;
  ticket_numero: number;
  fecha: string;
  total: number;
  subtotal: number;
  descuento: number;
  metodo_pago: string;
  estado: string;
  cliente_id: string | null;
  usuario_id: string;
  clientes?: { id: string; nombre: string; documento: string | null; puntos?: number; saldo_a_favor?: number } | null;
  perfiles?: { nombre: string } | null; // Cajero
  items?: any[];
};

export default function SalesHistoryPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedItemReturn, setSelectedItemReturn] = useState<any>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { profile: user } = useUserProfile();

  useEffect(() => {
    if (tenant) fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch ventas with profile (cajero) and client info
    const { data, error } = await supabase
      .from("ventas")
      .select(`
        *,
        clientes:cliente_id(id, nombre, documento, puntos, saldo_a_favor),
        perfiles:usuario_id(nombre),
        items:venta_items(
          cantidad,
          productos:producto_id(nombre)
        )
      `)
      .eq("tenant_id", tenant!.id)
      .order("fecha", { ascending: false });

    if (data) setVentas(data as any);
    setLoading(false);
  };

  const openDetail = async (venta: Venta) => {
    // Fetch items for this sale
    const { data: items } = await supabase
      .from("venta_items")
      .select(`
        *,
        productos:producto_id(nombre, sku)
      `)
      .eq("venta_id", venta.id);
    
    setSelectedVenta({ ...venta, items: items || [] });
    setIsDetailOpen(true);
  };

  const filtered = ventas.filter(v => 
    (v.clientes?.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
    v.id.toLowerCase().includes(search.toLowerCase()) ||
    (v.perfiles?.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleLinkClient = async (clientId: string) => {
    if (!selectedVenta) return;
    setIsLinking(true);
    try {
      const { data: clientData } = await (supabase.from("clientes") as any)
        .select("id, nombre, documento, puntos, saldo_a_favor")
        .eq("id", clientId)
        .single();

      await (supabase.from("ventas") as any)
        .update({ cliente_id: clientId })
        .eq("id", selectedVenta.id);
      
      setSelectedVenta({ ...selectedVenta, cliente_id: clientId, clientes: clientData });
      fetchData();
      alert("Cliente vinculado con éxito");
      setIsLinking(false);
    } catch (e) {
      console.error(e);
      alert("Error al vincular cliente");
    } finally {
      setIsLinking(false);
    }
  };

  const searchClients = async (val: string) => {
    setClientSearch(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    const { data } = await (supabase.from("clientes") as any)
      .select("*")
      .ilike("nombre", `%${val}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

  const handleVentaReturn = async (method: 'efectivo' | 'saldo_a_favor') => {
    if (!selectedItemReturn || !selectedVenta) return;
    
    setIsReturning(true);
    try {
      // 1. Reintregar al stock
      const { data: prodData } = await (supabase.from("productos") as any)
        .select("stock_actual")
        .eq("id", selectedItemReturn.producto_id)
        .single();
      
      const newStock = (prodData?.stock_actual || 0) + 1;
      
      await (supabase.from("productos") as any)
        .update({ stock_actual: newStock })
        .eq("id", selectedItemReturn.producto_id);

      // 2. Registrar movimiento de inventario
      await (supabase.from("inventario_movimientos") as any)
        .insert({
          producto_id: selectedItemReturn.producto_id,
          tipo: 'devolucion',
          cantidad: 1,
          motivo: `Devolución de venta REF: ${selectedVenta.id.slice(0,8)}`,
          sucursal_id: selectedVenta.sucursal_id,
          usuario_id: user?.id,
          tenant_id: selectedVenta.tenant_id
        });

      // 3. Manejar dinero
      if (method === 'efectivo') {
        const { data: sesion } = await (supabase.from("caja_sesiones") as any)
          .select("id")
          .eq("estado", "abierta")
          .maybeSingle();

        if (sesion) {
          await (supabase.from("caja_movimientos") as any)
            .insert({
              sesion_id: sesion.id,
              tipo: 'retiro',
              monto: selectedItemReturn.precio_unitario,
              concepto: `Devolución Efectivo REF: ${selectedVenta.id.slice(0,8)}`,
              metodo_pago: 'efectivo',
              usuario_id: user?.id,
              tenant_id: selectedVenta.tenant_id
            });
        }
      } else if (method === 'saldo_a_favor' && selectedVenta.cliente_id) {
        const { data: clientData } = await (supabase.from("clientes") as any)
          .select("saldo_a_favor")
          .eq("id", selectedVenta.cliente_id)
          .single();
        
        await (supabase.from("clientes") as any)
          .update({
            saldo_a_favor: (clientData?.saldo_a_favor || 0) + selectedItemReturn.precio_unitario
          })
          .eq("id", selectedVenta.cliente_id);
      }

      alert("Devolución procesada con éxito");
      setIsReturnOpen(false);
      setSelectedItemReturn(null);
    } catch (error) {
      console.error("Error in return:", error);
      alert("Error al procesar la devolución");
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-emerald-600" /> Historial de Ventas
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Control completo de transacciones, cajeros y clientes</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl border-slate-200 font-bold flex gap-2 h-11">
              <Download className="w-4 h-4" /> Exportar
           </Button>
           <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex gap-2 h-11 shadow-lg shadow-emerald-100">
              <Filter className="w-4 h-4" /> Filtros
           </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Ventas Totales", val: ventas.length, icon: ShoppingBag, color: "emerald" },
          { label: "Total Recaudado", val: formatCurrency(ventas.reduce((a, b) => a + b.total, 0)), icon: ArrowUpRight, color: "sky" },
          { label: "Ticket Promedio", val: formatCurrency(ventas.length > 0 ? ventas.reduce((a, b) => a + b.total, 0) / ventas.length : 0), icon: Clock, color: "violet" },
          { label: "Clientes Atendidos", val: new Set(ventas.map(v => v.cliente_id).filter(Boolean)).size, icon: UserCheck, color: "amber" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border-b-4 border-slate-100 shadow-sm border-r border-l border-t border-slate-100">
             <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <kpi.icon className={cn("w-4 h-4", `text-${kpi.color}-500`)} />
             </div>
             <p className="text-2xl font-black text-slate-800">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col flex-1">
        <div className="p-6 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              className="pl-12 h-12 border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white text-lg font-medium transition-all" 
              placeholder="Buscar por cliente, cajero o ID de venta..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 w-12 rounded-2xl border-slate-200">
             <Calendar className="w-5 h-5 text-slate-400" />
          </Button>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
             <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="font-black text-slate-300 uppercase text-xs tracking-[0.2em] animate-pulse">Cargando Historial...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="p-20 text-center opacity-30">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-black text-slate-400 uppercase text-sm italic">Sin ventas registradas</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-none">
                  <TableHead className="pl-8 font-black text-[10px] text-slate-400 uppercase tracking-widest h-14">REF # / Fecha y Hora</TableHead>
                  <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-14">Cajero</TableHead>
                  <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-14">Cliente</TableHead>
                  <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-14 text-center">Resumen / Concepto</TableHead>
                  <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-14 text-center">Método</TableHead>
                  <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest h-14 text-right">Total</TableHead>
                  <TableHead className="pr-8 h-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(
                  filtered.reduce((acc, v) => {
                    const d = new Date(v.fecha);
                    d.setHours(0,0,0,0);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffTime = Math.abs(today.getTime() - d.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let key = d.toLocaleDateString("es-CO", { weekday: 'long', day: 'numeric', month: 'long' });
                    if (diffDays === 0) key = "Hoy";
                    else if (diffDays === 1) key = "Ayer";

                    if (!acc[key]) acc[key] = [];
                    acc[key].push(v);
                    return acc;
                  }, {} as Record<string, Venta[]>)
                ).map(([dateLabel, groupVentas]) => (
                  <Fragment key={dateLabel}>
                    <TableRow className="bg-slate-100/50 hover:bg-slate-100/50">
                      <TableCell colSpan={6} className="py-2 pl-8 font-bold text-slate-600 text-xs uppercase tracking-widest">
                        {dateLabel}
                      </TableCell>
                    </TableRow>
                    {groupVentas.map(v => (
                      <TableRow key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="pl-8 py-4">
                           <span className="font-black text-slate-800 text-sm block">#{String(v.ticket_numero || 0).padStart(4, '0')}</span>
                           <span className="text-[10px] font-bold text-slate-400 flex flex-col gap-0.5 mt-0.5">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(v.fecha).toLocaleString("es-CO", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                           </span>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 font-black text-xs flex items-center justify-center">
                                 {(v.perfiles?.nombre || "C").substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-700 text-sm whitespace-nowrap">{v.perfiles?.nombre || "Sistema"}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <span className={cn("font-bold text-sm whitespace-nowrap", v.clientes ? "text-slate-800" : "text-slate-400 italic")}>
                              {v.clientes?.nombre || "Venta General"}
                           </span>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                           <p className="text-[10px] font-medium text-slate-500 truncate uppercase">
                              {v.items && v.items.length > 0 
                                ? v.items.map((i: any) => `${i.cantidad}x ${i.productos?.nombre}`).join(", ")
                                : "Sin items"}
                           </p>
                        </TableCell>
                        <TableCell className="text-center">
                           <Badge className={cn(
                              "rounded-lg font-black text-[9px] uppercase tracking-wider py-1 px-2.5",
                              v.estado === 'anulada' ? "bg-rose-50 text-rose-600 border-rose-100" :
                              v.metodo_pago === 'efectivo' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              v.metodo_pago === 'tarjeta' ? "bg-sky-50 text-sky-600 border-sky-100" :
                              "bg-violet-50 text-violet-600 border-violet-100"
                           )}>
                              {v.estado === 'anulada' ? 'ANULADA' : v.metodo_pago}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-lg text-slate-900 pr-4">
                           <span className={v.estado === 'anulada' ? "line-through text-slate-300" : ""}>
                             {formatCurrency(v.total)}
                           </span>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                              onClick={() => openDetail(v)}
                           >
                              <Eye className="w-5 h-5" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          {selectedVenta && (
            <div className="flex flex-col">
              <div className="bg-slate-900 p-8 text-white relative">
                 <div className="relative z-10 flex justify-between items-start">
                    <div>
                       <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] py-1 px-3 mb-3">RECIBO DIGITAL</Badge>
                       <h2 className="text-3xl font-black tracking-tight leading-none">Venta #{String(selectedVenta.ticket_numero || 0).padStart(4, '0')}</h2>
                       <p className="text-slate-400 font-bold text-xs mt-2 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> {new Date(selectedVenta.fecha).toLocaleString()}
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-slate-500 font-black text-[10px] tracking-widest uppercase mb-1">TOTAL FACTURADO</p>
                       <p className="text-4xl font-black text-emerald-400 tracking-tighter">{formatCurrency(selectedVenta.total)}</p>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-auto custom-scrollbar">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cajero</p>
                      <p className="font-bold text-slate-800 flex items-center gap-2">
                         <User className="w-4 h-4 text-emerald-600" /> {selectedVenta.perfiles?.nombre || "N/A"}
                      </p>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                      {selectedVenta.clientes ? (
                         <p className="font-bold text-slate-800 flex items-center gap-2 text-sm truncate">
                            <UserCheck className="w-4 h-4 text-emerald-600" /> {selectedVenta.clientes?.nombre}
                         </p>
                      ) : (
                         <div className="space-y-2">
                            <p className="font-bold text-slate-400 italic text-xs">VENTA GENERAL</p>
                            <div className="flex flex-col gap-2">
                               <div className="relative">
                                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <Input 
                                    placeholder="Buscar cliente..." 
                                    className="h-8 pl-8 text-[10px] rounded-lg"
                                    value={clientSearch}
                                    onChange={(e) => searchClients(e.target.value)}
                                  />
                               </div>
                               {searchResults.length > 0 && (
                                  <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1">
                                     {searchResults.map(c => (
                                        <button 
                                          key={c.id} 
                                          onClick={() => handleLinkClient(c.id)}
                                          className="w-full p-2 text-left text-[10px] hover:bg-emerald-50 border-b border-slate-50 last:border-none flex justify-between items-center group"
                                        >
                                           <span className="font-bold text-slate-600 truncate">{c.nombre}</span>
                                           <UserPlus className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                     ))}
                                  </div>
                               )}
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ítems Vendidos</p>
                   <div className="space-y-2">
                      {selectedVenta.items?.map((item: any, i: number) => (
                        <div key={i} className="group flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-100/50 hover:border-emerald-200 transition-all">
                           <div className="flex-1">
                              <p className="font-black text-slate-800 text-sm">{item.productos?.nombre || "Producto Eliminado"}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{item.productos?.sku || "S/N"}</p>
                           </div>
                           <div className="text-right">
                              <p className="font-bold text-slate-600 text-xs">x{item.cantidad}</p>
                              <p className="font-black text-emerald-700">{formatCurrency(item.subtotal)}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => {
                                setSelectedItemReturn(item);
                                setIsReturnOpen(true);
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Subtotal Breakdowns */}
                <div className="border-t border-slate-100 pt-6 space-y-2 px-2">
                   <div className="flex justify-between text-slate-500 text-sm font-bold uppercase tracking-wider">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedVenta.subtotal)}</span>
                   </div>
                   <div className="flex justify-between text-rose-500 text-sm font-bold uppercase tracking-wider">
                      <span>Descuentos Aplicados</span>
                      <span>-{formatCurrency(selectedVenta.descuento)}</span>
                   </div>
                   <div className="flex justify-between text-slate-800 text-lg font-black uppercase pt-2 border-t border-slate-50">
                      <span>A pagar</span>
                      <span className="text-emerald-600">{formatCurrency(selectedVenta.total)}</span>
                   </div>
                </div>
              </div>

              <div className="p-8 pt-0 flex gap-4">
                 <Button 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl border-slate-200 font-black text-sm shadow-sm"
                    onClick={async () => {
                       if (confirm("¿Estás seguro de anular esta venta?")) {
                          await supabase.from("ventas").update({ estado: 'anulada' }).eq("id", selectedVenta.id);
                          alert("Venta anulada con éxito.");
                          fetchData();
                          setIsDetailOpen(false);
                       }
                    }}
                 >
                    ANULAR VENTA
                 </Button>
                 <Button 
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100"
                    onClick={() => {
                        alert("Enviando orden a la impresora térmica...");
                        // window.print(); // Lógica real
                    }}
                 >
                    REIMPRIMIR TICKET
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

       {/* DIALOG DE OPCIONES DE DEVOLUCIÓN */}
       <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
         <DialogContent className="max-w-md rounded-[3rem] border-none shadow-2xl p-8 bg-white">
           <DialogHeader className="text-center">
             <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8" />
             </div>
             <DialogTitle className="text-2xl font-black text-slate-800">Procesar Devolución</DialogTitle>
             <DialogDescription className="text-slate-500 font-medium text-center">
               ¿Cómo deseas reintegrar el dinero al cliente por este ítem?
               <p className="mt-2 text-slate-900 font-black">{selectedItemReturn?.productos?.nombre}</p>
             </DialogDescription>
           </DialogHeader>

           <div className="grid gap-4 mt-6">
              <Button
                disabled={isReturning}
                onClick={() => handleVentaReturn('efectivo')}
                className="h-20 bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 rounded-3xl flex flex-col gap-1 items-center justify-center transition-all group shadow-sm"
              >
                <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest">
                   <DollarSign className="w-3.5 h-3.5" /> Reembolso Instantáneo
                </div>
                <span className="font-black text-lg">Devolver en Efectivo</span>
              </Button>

              <Button
                disabled={isReturning || !selectedVenta?.cliente_id}
                onClick={() => handleVentaReturn('saldo_a_favor')}
                className={cn(
                  "h-20 border-2 rounded-3xl flex flex-col gap-1 items-center justify-center transition-all group shadow-sm",
                  !selectedVenta?.cliente_id 
                    ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                    : "bg-white border-slate-100 hover:border-sky-500 hover:bg-sky-50 text-slate-800"
                )}
              >
                <div className="flex items-center gap-2 text-sky-600 font-black uppercase text-[10px] tracking-widest">
                   <Wallet className="w-3.5 h-3.5" /> Crédito CRM
                </div>
                <span className="font-black text-lg">Abonar Saldo a Favor</span>
                {!selectedVenta?.cliente_id && <p className="text-[8px] font-bold text-slate-400 text-center">REQUIERE CLIENTE REGISTRADO</p>}
              </Button>
           </div>

           <Button variant="ghost" onClick={() => setIsReturnOpen(false)} className="mt-4 w-full font-bold text-slate-400">
              CANCELAR
           </Button>
         </DialogContent>
       </Dialog>

       {/* DIALOG DE OPCIONES DE DEVOLUCIÓN */}
       <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
         <DialogContent className="max-w-md rounded-[3rem] border-none shadow-2xl p-8 bg-white text-slate-900">
           <DialogHeader className="text-center">
             <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8" />
             </div>
             <DialogTitle className="text-2xl font-black text-slate-800">Procesar Devolución</DialogTitle>
             <DialogDescription className="text-slate-500 font-medium text-center">
               ¿Cómo deseas reintegrar el dinero al cliente por este ítem?
               <p className="mt-2 text-slate-900 font-black">{selectedItemReturn?.productos?.nombre}</p>
             </DialogDescription>
           </DialogHeader>

           <div className="grid gap-4 mt-6">
              <Button
                disabled={isReturning}
                onClick={() => handleVentaReturn('efectivo')}
                className="h-20 bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 rounded-3xl flex flex-col gap-1 items-center justify-center transition-all group shadow-sm"
              >
                <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest">
                   <DollarSign className="w-3.5 h-3.5" /> Reembolso Instantáneo
                </div>
                <span className="font-black text-lg">Devolver en Efectivo</span>
              </Button>

              <Button
                disabled={isReturning || !selectedVenta?.cliente_id}
                onClick={() => handleVentaReturn('saldo_a_favor')}
                className={cn(
                  "h-20 border-2 rounded-3xl flex flex-col gap-1 items-center justify-center transition-all group shadow-sm",
                  !selectedVenta?.cliente_id 
                    ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                    : "bg-white border-slate-100 hover:border-sky-500 hover:bg-sky-50 text-slate-800"
                )}
              >
                <div className="flex items-center gap-2 text-sky-600 font-black uppercase text-[10px] tracking-widest">
                   <Wallet className="w-3.5 h-3.5" /> Crédito CRM
                </div>
                <span className="font-black text-lg">Abonar Saldo a Favor</span>
                {!selectedVenta?.cliente_id && <p className="text-[8px] font-bold text-slate-400 text-center">REQUIERE CLIENTE REGISTRADO</p>}
              </Button>
           </div>

           <Button variant="ghost" onClick={() => setIsReturnOpen(false)} className="mt-4 w-full font-bold text-slate-400">
              CANCELAR
           </Button>
         </DialogContent>
       </Dialog>
    </div>
  );
}
