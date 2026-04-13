"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Filter,
  Users,
  MessageSquare,
  History,
  Phone,
  UserCheck,
  Trash2,
  DollarSign
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { CustomerForm } from "./components/CustomerForm";

export default function CustomersPage() {
  const { tenant, loading: tenantLoading } = useUserProfile();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  
  // Abono
  const [isPayOffOpen, setIsPayOffOpen] = useState(false);
  const [customerToPay, setCustomerToPay] = useState<any>(null);
  const [payOffAmount, setPayOffAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!tenantLoading) {
      if (tenant) {
        fetchCustomers();
      } else {
        setLoading(false);
      }
    }
  }, [tenant, tenantLoading]);

  const fetchCustomers = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await (supabase.from("clientes" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("nombre");

    if (data) setCustomers(data);
    setLoading(false);
  };

  const handleDeleteCustomer = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente ${nombre}?`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      fetchCustomers();
    }
  };

  const handlePayOff = async () => {
    if (!tenant?.id || !customerToPay) return;
    const amount = Number(payOffAmount.replace(/\./g, ''));
    if (amount <= 0) return;
    setIsPaying(true);
    
    const currentSaldo = customerToPay.saldo_pendiente || 0;
    const newSaldo = Math.max(0, currentSaldo - amount);

    const { error } = await supabase.from("clientes").update({ saldo_pendiente: newSaldo }).eq("id", customerToPay.id);
    if (!error) {
       const { data: sessionData } = await supabase
          .from("sesiones_caja")
          .select("*")
          .eq("tenant_id", tenant.id)
          .is("hora_cierre", null)
          .maybeSingle();
       
       if (sessionData) {
          await supabase.from("caja_movimientos").insert({
            tenant_id: tenant.id,
            sesion_id: sessionData.id,
            caja_id: sessionData.caja_id,
            tipo: 'ingreso',
            monto: amount,
            descripcion: `Abono de cartera fiado: ${customerToPay.nombre}`,
            metodo_pago: 'efectivo'
          });
       }

       alert("Abono registrado y saldo actualizado.");
       setIsPayOffOpen(false);
       setPayOffAmount("");
       setCustomerToPay(null);
       fetchCustomers();
    } else {
       alert("Error al registrar abono: " + error.message);
    }
    setIsPaying(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.documento && c.documento.includes(searchTerm))
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 h-full flex flex-col overflow-hidden font-sans">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-7xl w-full max-h-[95vh] overflow-y-auto rounded-[3.5rem] border-none shadow-2xl p-0 bg-white text-slate-900">
          <div className="p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-4xl font-black text-slate-800 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  {selectedCustomer ? <UserCheck className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                </div>
                {selectedCustomer ? "Editar Perfil" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-lg">
                Registra los datos de contacto y condiciones comerciales del cliente.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              customer={selectedCustomer}
              onSave={() => {
                setIsDialogOpen(false);
                fetchCustomers();
              }}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">CRM de Clientes</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Gestión de fidelidad, puntos y cartera (fiado)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setSelectedCustomer(null);
              setIsDialogOpen(true);
            }}
            className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-100 rounded-2xl transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5 mr-2" /> Nuevo Cliente
          </Button>
          <Button variant="outline" className="h-12 px-6 text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-2 font-black rounded-2xl text-slate-900">
            <MessageSquare className="w-5 h-5" /> Enviar Campaña
          </Button>
        </div>
      </div>

      <div className="px-8 py-4 bg-white flex flex-col sm:flex-row gap-4 border-b border-slate-100">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-3 text-slate-400" />
          <Input
            className="pl-12 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:ring-emerald-500 rounded-xl"
            placeholder="Buscar por nombre o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-0 text-slate-900">
        {loading ? (
          <div className="p-24 text-center">
            <div className="animate-pulse space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto" />
              <p className="text-slate-400 font-black italic uppercase tracking-widest text-xs opacity-60">Sincronizando base de clientes...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">Cliente / Documento</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center">Nivel</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Puntos</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Saldo Fiado</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">F. Registro</TableHead>
                <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-100 group">
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-all border border-transparent group-hover:border-emerald-200">
                        {item.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-base">{item.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.documento || "Sin Documento"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-lg px-3 py-1 font-black text-[10px] uppercase border-2",
                        item.tipo_cliente === "mayorista" ? "border-purple-200 text-purple-700 bg-purple-50" :
                          item.tipo_cliente === "vip" ? "border-amber-200 text-amber-700 bg-amber-50" :
                            item.tipo_cliente === "empleado" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                              "border-slate-100 text-slate-500 bg-slate-50"
                      )}
                    >
                      {item.tipo_cliente === "normal" ? "Regular" : (item.tipo_cliente || "Regular")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg text-sm border border-emerald-100 shadow-sm">{item.puntos || 0}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">Pts</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "font-black px-3 py-1 rounded-lg text-sm border shadow-sm",
                        (item.saldo_pendiente || 0) > 0 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-400 border-slate-100"
                      )}>
                        {formatCurrency(item.saldo_pendiente || 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-2 text-slate-400">
                      <History className="w-4 h-4 text-slate-300" />
                      <span className="text-[10px] font-black uppercase tracking-tight">{item.fecha_registro ? new Date(item.fecha_registro).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center pr-8">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <Button
                        onClick={() => {
                          setSelectedCustomer(item);
                          setIsDialogOpen(true);
                        }}
                        variant="ghost" title="Editar Perfil" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                      >
                        <UserCheck className="w-5 h-5" />
                      </Button>
                      <Button 
                        onClick={() => {
                           setCustomerToPay(item);
                           setIsPayOffOpen(true);
                        }}
                        disabled={!item.saldo_pendiente || item.saldo_pendiente <= 0}
                        variant="ghost" title="Abonar a la Deuda" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent">
                        <DollarSign className="w-5 h-5" />
                      </Button>
                      <Button 
                        onClick={() => handleDeleteCustomer(item.id, item.nombre)}
                        variant="ghost" title="Eliminar Cliente" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                     </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32 bg-slate-50/10">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <Users className="w-16 h-16 text-slate-300" />
                      <p className="text-slate-500 font-bold italic">No hay clientes registrados en este catálogo.</p>
                      <Button onClick={() => setIsDialogOpen(true)} variant="link" className="text-emerald-600 font-black uppercase tracking-widest text-xs">Registrar mi primer cliente</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
             </TableBody>
           </Table>
         )}
      </div>

      <Dialog open={isPayOffOpen} onOpenChange={setIsPayOffOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8 bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800">Abonar a Deuda</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Cliente: <span className="font-bold text-slate-700">{customerToPay?.nombre}</span>
              <br />
              Deuda Actual: <span className="font-bold text-rose-600">{formatCurrency(customerToPay?.saldo_pendiente || 0)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
               <label className="text-[10px] uppercase font-black tracking-widest text-emerald-600">Monto a Abonar</label>
               <div className="relative">
                 <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                 <Input 
                   type="text" 
                   value={payOffAmount}
                   onChange={(e) => {
                     // Formatter inline para visual
                     const val = e.target.value.replace(/\D/g, "");
                     if (val) {
                       setPayOffAmount(new Intl.NumberFormat('es-CO').format(Number(val)));
                     } else {
                       setPayOffAmount("");
                     }
                   }}
                   placeholder="0" 
                   className="pl-10 h-14 text-xl font-black text-slate-800 border-slate-200 rounded-xl focus:ring-emerald-500 shadow-sm"
                 />
               </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <Button onClick={() => setIsPayOffOpen(false)} variant="ghost" className="h-12 px-6 font-bold text-slate-400 hover:text-slate-600 rounded-xl">Cancelar</Button>
               <Button onClick={handlePayOff} disabled={isPaying || !payOffAmount} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">
                 {isPaying ? "Procesando..." : "Confirmar Abono"}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
