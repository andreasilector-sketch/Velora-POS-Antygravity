"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  PackagePlus, 
  Search, 
  Plus, 
  Trash2, 
  Save,
  Truck,
  FileText,
  Calendar,
  PackageCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, cn } from "@/lib/utils";

export default function PurchasesPage() {
  const { tenant } = useUserProfile();
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();

  // New Purchase State
  const [factura, setFactura] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [tipoPago, setTipoPago] = useState("contado");
  const [diasCredito, setDiasCredito] = useState(0);
  const [metodoPago, setMetodoPago] = useState("efectivo");

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      fetchIngresos();
      fetchProductos();
    }
  }, [tenant]);

  const fetchIngresos = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("ingresos_inventario" as any) as any)
      .select(`
        *,
        ingresos_inventario_items (
          producto_id,
          cantidad,
          costo_unitario,
          subtotal,
          productos (nombre)
        )
      `)
      .eq("tenant_id", tenant?.id)
      .order("created_at", { ascending: false });

    if (data) setIngresos(data);
    setLoading(false);
  };

  const fetchProductos = async () => {
    const { data } = await supabase
      .from("productos")
      .select("id, nombre, sku, precio_compra")
      .eq("tenant_id", tenant!.id)
      .order("nombre");
    if (data) setProductos(data);
  };

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addItemToPurchase = (prod: any) => {
    const exists = items.find(i => i.producto_id === prod.id);
    if (!exists) {
      setItems([...items, {
        producto_id: prod.id,
        nombre: prod.nombre,
        cantidad: 1,
        costo_unitario: prod.precio_compra || 0,
        subtotal: prod.precio_compra || 0
      }]);
    }
    setSearchTerm("");
  };

  const updateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    newItems[index].subtotal = newItems[index].cantidad * newItems[index].costo_unitario;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalGlobal = items.reduce((acc, item) => acc + item.subtotal, 0);

  const handleEdit = (ing: any) => {
    setEditingId(ing.id);
    setFactura(ing.numero_factura || "");
    setProveedor(ing.proveedor || "");
    setObservaciones(ing.observaciones || "");
    setTipoPago(ing.tipo_pago || "contado");
    setDiasCredito(ing.dias_credito || 0);
    setMetodoPago(ing.metodo_pago || "efectivo");
    
    // Transform items from query result
    const loadedItems = ing.ingresos_inventario_items.map((i: any) => ({
      producto_id: i.producto_id,
      nombre: i.productos?.nombre || "Producto desconocido",
      cantidad: Number(i.cantidad),
      costo_unitario: Number(i.costo_unitario),
      subtotal: Number(i.subtotal)
    }));
    setItems(loadedItems);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFactura("");
    setProveedor("");
    setObservaciones("");
    setTipoPago("contado");
    setDiasCredito(0);
    setMetodoPago("efectivo");
    setItems([]);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent, targetEstado: string = "completado") => {
    if (e) e.preventDefault();
    if (items.length === 0) return alert("Agrega al menos un producto.");
    setIsSubmitting(true);

    try {
      let ingresoId = editingId;

      const payloadHeader = {
        tenant_id: tenant?.id,
        numero_factura: factura,
        proveedor: proveedor,
        observaciones: observaciones,
        total: totalGlobal,
        tipo_pago: tipoPago,
        estado: targetEstado,
        dias_credito: tipoPago === "credito" ? diasCredito : 0,
        metodo_pago: tipoPago === "contado" ? metodoPago : "cuentas_por_pagar"
      };

      if (editingId) {
        // 1. Actualizar Cabecera
        const { error: errUpdate } = await (supabase
          .from("ingresos_inventario" as any) as any)
          .update(payloadHeader)
          .eq("id", editingId);
        
        if (errUpdate) throw errUpdate;

        // 2. Eliminar Items anteriores para re-insertar
        const { error: errDelete } = await (supabase
          .from("ingresos_inventario_items" as any) as any)
          .delete()
          .eq("ingreso_id", editingId);
        
        if (errDelete) throw errDelete;
      } else {
        // 1. Crear el Ingreso (Cabecera)
        const { data: ingreso, error: errIngreso } = await (supabase
          .from("ingresos_inventario" as any) as any)
          .insert(payloadHeader)
          .select()
          .single();

        if (errIngreso) throw errIngreso;
        ingresoId = ingreso.id;
      }

      // 3. Crear los Detalles
      const itemsPayload = items.map(i => ({
        ingreso_id: ingresoId,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        costo_unitario: i.costo_unitario,
        subtotal: i.subtotal
      }));

      const { error: errItems } = await (supabase
        .from("ingresos_inventario_items" as any) as any)
        .insert(itemsPayload);

      if (errItems) throw errItems;

      // Reset y Recargar
      resetForm();
      fetchIngresos();
      
      alert(targetEstado === "completado" 
        ? "Ingreso finalizado correctamente. El stock ha sido actualizado." 
        : "Borrador guardado correctamente.");
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden font-sans">
      
      {/* Modal de Nueva Entrada */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[85vw] lg:max-w-5xl w-full p-0 overflow-hidden bg-slate-50 border-none rounded-[2rem] shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col h-[85vh] md:h-[80vh]">
            <div className="p-6 bg-white border-b border-slate-100 flex-shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <PackagePlus className="w-6 h-6" />
                  </div>
                  {editingId ? "Editar Entrada de Mercancía" : "Nueva Entrada de Mercancía"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-500 uppercase">Proovedor</Label>
                  <div className="relative">
                    <Truck className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input value={proveedor} onChange={e => setProveedor(e.target.value)} required className="pl-9 h-10 border-slate-200 bg-white rounded-xl shadow-sm" placeholder="Nombre Proveedor" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-500 uppercase">N° Factura / Remisión</Label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input value={factura} onChange={e => setFactura(e.target.value)} required className="pl-9 h-10 border-slate-200 bg-white rounded-xl shadow-sm" placeholder="000-000" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-500 uppercase">Observación</Label>
                  <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} className="h-10 border-slate-200 bg-white rounded-xl shadow-sm" placeholder="Detalles de entrega..." />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-500 uppercase">Tipo de Pago</Label>
                  <select 
                    value={tipoPago}
                    onChange={e => setTipoPago(e.target.value)}
                    className="w-full flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 font-bold text-slate-800"
                  >
                     <option value="contado">De Contado</option>
                     <option value="credito">A Crédito</option>
                  </select>
                </div>

                {tipoPago === "contado" ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-500 uppercase">Canal de Pago</Label>
                    <select 
                      value={metodoPago}
                      onChange={e => setMetodoPago(e.target.value)}
                      className="w-full flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 font-bold text-emerald-700"
                    >
                       <option value="efectivo">Efectivo (Caja)</option>
                       <option value="transferencia">Transferencia Bancaria</option>
                       <option value="consignacion">Consignación Bancaria</option>
                       <option value="tarjeta">Tarjeta de Crédito / Débito</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs font-black text-slate-500 uppercase">Días de Crédito</Label>
                    <Input 
                        type="number" 
                        min="0"
                        value={diasCredito} 
                        onChange={e => setDiasCredito(Number(e.target.value))} 
                        required 
                        className="h-10 border-slate-200 bg-white rounded-xl shadow-sm font-bold text-slate-800" 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden border-t border-slate-100">
              {/* Buscador de Productos */}
              <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      placeholder="Buscar producto a ingresar..." 
                      className="pl-9 bg-slate-50 border-slate-200 rounded-xl h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {searchTerm && filteredProductos.map(prod => (
                    <button 
                      key={prod.id}
                      type="button"
                      onClick={() => addItemToPurchase(prod)}
                      className="flex flex-col text-left w-full p-3 hover:bg-emerald-50 rounded-xl transition-colors mb-1 group"
                    >
                      <span className="font-bold text-sm text-slate-700 group-hover:text-emerald-700">{prod.nombre}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{prod.sku || "Sin SKU"}</span>
                    </button>
                  ))}
                  {searchTerm && filteredProductos.length === 0 && (
                    <p className="p-4 text-center text-xs font-bold text-slate-400 italic">No hay resultados</p>
                  )}
                  {!searchTerm && (
                    <div className="h-full flex items-center justify-center p-6 text-center text-slate-400">
                      <p className="text-xs font-bold">Busca un producto para añadirlo a la factura</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Items Agregados */}
              <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
                <h4 className="font-black text-sm text-slate-600 mb-4 uppercase tracking-widest">Detalle de Ingreso</h4>
                
                {items.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl h-40 flex items-center justify-center">
                    <p className="text-slate-400 font-bold text-sm">El detalle de la factura está vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{item.nombre}</p>
                        </div>
                        <div className="w-24">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Cantidad</Label>
                          <Input 
                            type="number" 
                            min="1"
                            value={item.cantidad || ""}
                            onChange={(e) => updateItem(idx, "cantidad", Number(e.target.value))}
                            className="h-8 font-black text-emerald-700 bg-emerald-50 border-emerald-100"
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Costo Un.</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">$</span>
                            <Input 
                              type="number" 
                              min="0"
                              value={item.costo_unitario || ""}
                              onChange={(e) => updateItem(idx, "costo_unitario", Number(e.target.value))}
                              className="h-8 pl-5 font-bold text-slate-700"
                            />
                          </div>
                        </div>
                        <div className="w-28 text-right pr-2">
                          <Label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Subtotal</Label>
                          <span className="font-black text-slate-800">{formatCurrency(item.subtotal)}</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeItem(idx)}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-8 h-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Factura:</p>
                <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalGlobal)}</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => resetForm()} className="rounded-xl font-bold px-6">
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={isSubmitting || items.length === 0} 
                  onClick={(e) => handleSubmit(e, "borrador")}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl font-bold px-6"
                >
                  <Save className="w-4 h-4 mr-2" /> Guardar Borrador
                </Button>
                <Button 
                  type="button"
                  disabled={isSubmitting || items.length === 0} 
                  onClick={(e) => handleSubmit(e, "completado")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black px-8"
                >
                  <PackageCheck className="w-4 h-4 mr-2" /> Finalizar e Ingresar Stock
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header Vista Principal */}
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
            <PackagePlus className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Entradas de Mercancía</h2>
            <p className="text-sm text-slate-500 font-medium">Historial de compras y actualización automática de stock</p>
          </div>
        </div>

        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" /> Registrar Factura
        </Button>
      </div>

      {/* Tabla Principal */}
      <div className="flex-1 overflow-auto p-0">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-medium">Cargando historial...</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">Fecha</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">N° Factura</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Proveedor</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Total</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingresos.map((ing) => (
                <TableRow key={ing.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-sm">{new Date(ing.fecha).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md tracking-wider">
                      {ing.numero_factura}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-slate-800">{ing.proveedor}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-slate-900">{formatCurrency(ing.total)}</span>
                  </TableCell>
                  <TableCell>
                    {ing.estado === 'borrador' ? (
                      <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Borrador</span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Completado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(ing)}
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold rounded-lg"
                    >
                      {ing.estado === 'borrador' ? "Continuar" : "Ver / Editar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {ingresos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32 bg-slate-50/10">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <PackagePlus className="w-16 h-16 text-slate-300" />
                      <p className="text-slate-500 font-bold italic">No hay entradas de mercancía registradas.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
