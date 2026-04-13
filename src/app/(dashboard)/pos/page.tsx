"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ReceiptTicket } from "@/components/pos/ReceiptTicket";
import { PosErrorBoundary } from "@/components/pos/PosErrorBoundary";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Receipt, 
  CheckCircle2, 
  User, 
  Sparkles, 
  ShoppingCart, 
  DollarSign, 
  Printer,
  Smartphone,
  Wallet,
  Users,
  SearchIcon,
  X,
  Scale,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Boxes,
  Package
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, formatNumberWithDots, parseFormattedNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CustomerForm } from "../customers/components/CustomerForm";
import { normalizeText } from "@/lib/utils";

// Tipos
type Product = {
  id: string;
  nombre: string;
  precio_venta: number;
  stock_actual?: number | null; 
  stock_minimo?: number | null;
  categoria_id?: string | null;
  sku: string | null;
  codigo_barras: string | null;
  es_fraccionado: boolean;
  [key: string]: any;
};

type CartItem = Product & { 
  qty: number; 
  discount: number; 
  manualDiscountPercent?: number;
};

export default function POSPageWithBoundary() {
  return (
    <PosErrorBoundary>
      <AdvancedPOSPage />
    </PosErrorBoundary>
  );
}

function AdvancedPOSPage() {
  const router = useRouter();
  const { tenant, profile } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  
  // Payment State
  const [paymentType, setPaymentType] = useState<"single" | "mixed">("single");
  const [selectedMethod, setSelectedMethod] = useState<string>("efectivo");
  const [mixedPayments, setMixedPayments] = useState<{method: string, amount: number, accountName?: string}[]>([]);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");

  const [promotions, setPromotions] = useState<any[]>([]);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const supabase = createClient();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastVenta, setLastVenta] = useState<any>(null);
  const [selectedProductInfo, setSelectedProductInfo] = useState<Product | null>(null);

  // Safe print handler – works with React 19 without react-to-print
  const handlePrint = useCallback((refToPrint?: React.RefObject<HTMLDivElement>) => {
    const targetRef = refToPrint || receiptRef;
    if (!targetRef.current) return;
    try {
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) return;
      printWindow.document.write(`<html><head><title>Recibo</title></head><body>${targetRef.current.innerHTML}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch { /* silently ignore print errors */ }
  }, []);

  useEffect(() => {
    if (tenant) {
      fetchProducts();
      fetchActiveSession();
      fetchBankAccounts();
      fetchPromotions();
    }
  }, [tenant]);

  // Barcode Scanner Listener
  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
    if (products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const addId = urlParams.get('add');
      if (addId) {
        const prod = products.find(p => p.id === addId);
        if (prod) {
          addToCart(prod);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [products]);

  // Barcode Scanner Listener
  useEffect(() => {
    const handleGlobalScan = (e: Event) => {
      const customEvent = e as CustomEvent;
      const buffer = customEvent.detail.barcode;
      const product = productsRef.current.find(p => p.codigo_barras === buffer || p.sku === buffer);
      if (product) {
        addToCart(product);
      }
    };
    window.addEventListener('global-barcode-scanned', handleGlobalScan);
    return () => window.removeEventListener('global-barcode-scanned', handleGlobalScan);
  }, []); // Solamente se monta una vez

  const fetchPromotions = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("promociones" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("activo", true);
    if (data) setPromotions(data);
  };

  const fetchProducts = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await (supabase.from("productos" as any) as any)
      .select(`
        *,
        categorias(nombre)
      `)
      .eq("tenant_id", tenant.id as string)
      .order("nombre");
    if (data) setProducts(data as any);
    setLoading(false);
  };

  const fetchActiveSession = async () => {
    if (!profile?.id) return;
     const { data } = await (supabase.from("sesiones_caja" as any) as any)
      .select("*")
      .eq("estado", "abierta")
      .eq("usuario_id", profile.id)
      .maybeSingle();
    setActiveSession(data);
  };

  const fetchBankAccounts = async () => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("cuentas_bancarias" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("activo", true);
    if (data) {
      setBankAccounts(data);
      if (data.length > 0) setSelectedBankId((data as any)[0].id);
    }
  };

  const fetchClients = async (q: string) => {
    if (!tenant?.id) return;
    const { data } = await (supabase.from("clientes" as any) as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .ilike("nombre", `%${q}%`)
      .limit(5);
    if (data) setClients(data);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      let newCart;
      if (existing) {
        newCart = prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        newCart = [...prev, { ...product, qty: 1, discount: 0 }];
      }
      return applyPromotions(newCart);
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const newCart = prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0.1, item.qty + delta);
          return { ...item, qty: Number(newQty.toFixed(2)) };
        }
        return item;
      }).filter(item => item.qty > 0);
      return applyPromotions(newCart);
    });
  };

  const applyPromotions = (currentCart: CartItem[]) => {
    return currentCart.map(item => {
      // 1. Base product discount (from its definition)
      let calculatedBaseDiscount = 0;
      if (item.isFloorPriceApplied) {
        calculatedBaseDiscount = (item.precio_venta * item.qty) - (item.precio_minimo * item.qty);
      } else {
        const baseDiscountPercent = Math.max(Number(item.descuento) || 0, item.manualDiscountPercent || 0);
        calculatedBaseDiscount = (item.precio_venta * item.qty) * (baseDiscountPercent / 100);
      }

      let bestPromoDiscount = 0;
      
      promotions.forEach(promo => {
        let currentDiscount = 0;
        if (promo.aplica_a_todo) {
          if (promo.tipo === 'descuento_porcentaje') {
            currentDiscount = (item.precio_venta * item.qty) * (promo.valor / 100);
          } else if (promo.tipo === '2x1' && item.qty >= 2) {
            const freeUnits = Math.floor(item.qty / 2);
            currentDiscount = freeUnits * item.precio_venta;
          } else if (promo.tipo === 'descuento_fijo' && item.qty >= (promo.cantidad_minima || 1)) {
            currentDiscount = promo.valor;
          }
        }
        if (currentDiscount > bestPromoDiscount) bestPromoDiscount = currentDiscount;
      });

      // Use the best discount option
      return { ...item, discount: Math.max(calculatedBaseDiscount, bestPromoDiscount) };
    });
  };

  const updateDiscount = (id: string, value: number) => {
    setCart(prev => {
      const newCart = prev.map(item => 
        item.id === id ? { ...item, manualDiscountPercent: value, isFloorPriceApplied: false } : item
      );
      return applyPromotions(newCart);
    });
  };

  const applyFloorPrice = (id: string) => {
    setCart(prev => {
      const newCart = prev.map(item => {
        if (item.id === id && item.precio_minimo > 0) {
          // Apply EXACT floor price explicitly
          return { ...item, isFloorPriceApplied: true, manualDiscountPercent: 0 };
        }
        return item;
      });
      return applyPromotions(newCart);
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.precio_venta * item.qty), 0);
  const totalDiscount = cart.reduce((acc, item) => acc + item.discount, 0);
  const total = subtotal - totalDiscount;

  const handleCharge = async () => {
    if (cart.length === 0 || !tenant || !profile) return;
    setIsProcessing(true);

    try {
      // 1. Create Sale
      const { data: venta, error: vErr } = await (supabase.from("ventas" as any) as any)
        .insert({
          tenant_id: tenant.id,
          usuario_id: profile.id,
          cliente_id: selectedClient?.id || null,
          total: total,
          subtotal: subtotal,
          impuestos: 0,
          descuento: totalDiscount,
          metodo_pago: paymentType === "mixed" ? "mixto" : selectedMethod,
          estado: 'completada'
        } as any)
        .select()
        .single() as any;

      if (vErr) throw vErr;

      // 2. Insert Items
      const items = cart.map(i => ({
        venta_id: (venta as any).id,
        producto_id: i.id,
        cantidad: i.qty,
        precio_unitario: i.precio_venta,
        descuento: i.discount,
        subtotal: (i.precio_venta * i.qty) - i.discount
      }));
      await (supabase.from("venta_items" as any) as any).insert(items as any);

      // 3. Register Payment(s)
      const isMixed = paymentType === "mixed";
      const paymentRecords = isMixed 
        ? mixedPayments.map(p => ({
            venta_id: (venta as any).id,
            metodo_pago: p.method,
            monto: p.amount,
            cuenta_bancaria_id: p.method === "transferencia" ? selectedBankId : null
          }))
        : [{
            venta_id: (venta as any).id,
            metodo_pago: selectedMethod,
            monto: total,
            cuenta_bancaria_id: selectedMethod === "transferencia" ? selectedBankId : null
          }];

      await (supabase.from("pagos" as any) as any).insert(paymentRecords as any);

      // 3.5 Update Client Credit Balance (if any payment is credit)
      if (selectedClient) {
        let totalCredit = 0;
        for (const pr of paymentRecords as any[]) {
          if (pr.metodo_pago === "credito_cliente") {
            totalCredit += pr.monto;
          }
        }

        if (totalCredit > 0) {
          await (supabase.from("clientes" as any) as any)
            .update({
              saldo_pendiente: (selectedClient.saldo_pendiente || 0) + totalCredit,
              credito_disponible: (selectedClient.credito_disponible || 0) - totalCredit
            } as any)
            .eq("id", selectedClient.id);
        }
      }

      // 4. Actualizar Stock + Registrar Movimiento de Inventario (transacción atómica en servidor)
      for (const item of cart) {
        const { error: stockErr } = await supabase.rpc("process_sale_stock" as any, {
          p_tenant_id:   tenant.id,
          p_producto_id: item.id,
          p_cantidad:    item.qty,
          p_venta_ref:   `#${(venta as any).id.substring(0, 8).toUpperCase()}`,
          p_usuario_id:  profile.id,
        });
        if (stockErr) throw new Error(`Error actualizando stock de "${item.nombre}": ${stockErr.message}`);
      }

      // 5. Register Caja Movement (Real-time Sync)
      if (activeSession) {
        for (const pr of paymentRecords as any[]) {
          const { error: moveErr } = await (supabase.from("caja_movimientos" as any) as any).insert({
            tenant_id: tenant.id,
            sesion_id: activeSession.id,
            caja_id: activeSession.caja_id,
            tipo: 'venta',
            monto: pr.monto,
            descripcion: `Venta #${((venta as any)?.id || '').substring(0,8)}`,
            metodo_pago: pr.metodo_pago,
            usuario_id: profile.id
          });
          if (moveErr) console.error("Error logging movement:", moveErr);
        }
      }

      // 6. Trigger Printing & Success State
      const finalVentaData = {
        ...venta,
        items: items,
        cart: [...cart],
        subtotal,
        total,
        totalDiscount,
        client: selectedClient,
        cashReceived: parseFormattedNumber(cashReceived),
        change: Math.max(0, parseFormattedNumber(cashReceived) - total)
      };

      setLastVenta(finalVentaData);
      setIsSuccessOpen(true);
      
      // Attempt auto-print
      setTimeout(() => {
        handlePrint();
      }, 700);

      // Optimistic UI: update local stock immediately (no reload needed)
      setProducts(prev => prev.map(p => {
        const soldItem = cart.find(c => c.id === p.id);
        if (soldItem) {
          return { ...p, stock_actual: Math.max(0, (p.stock_actual || 0) - soldItem.qty) };
        }
        return p;
      }));

      // Reset state for next sale
      setCart([]);
      setSelectedClient(null);
      setCashReceived("");
      setMixedPayments([]);
      setIsPaymentOpen(false);
      
    } catch (err: any) {
      alert("Error Crítico al Procesar: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return false;
    const s = normalizeText(searchTerm);
    return normalizeText(p.nombre).includes(s) || 
           (p.sku && normalizeText(p.sku).includes(s)) ||
           (p.codigo_barras && normalizeText(p.codigo_barras).includes(s)) ||
           (p.sintomas_alivia && normalizeText(p.sintomas_alivia).includes(s)) ||
           (p.beneficios && normalizeText(p.beneficios).includes(s)) ||
           (p.ingredientes && normalizeText(p.ingredientes).includes(s));
  });

  return (
    <div className="flex flex-col xl:flex-row h-full gap-3 xl:gap-4 font-sans">
      {/* SECCIÓN IZQUIERDA: PRODUCTOS */}
      <div className="flex-1 flex flex-col min-w-0 gap-3 h-[50vh] xl:h-auto">
        <div className="flex gap-3">
           <div className="relative flex-1 group">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input 
                className="pl-11 h-12 text-lg border-slate-200 bg-white rounded-xl shadow-sm focus:ring-emerald-500 focus:border-emerald-500 barcode-capture"
                placeholder="Escanea o busca por nombre..."
                value={searchTerm}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const exactMatch = products.find(p => 
                      p.codigo_barras === searchTerm || 
                      p.sku === searchTerm || 
                      p.nombre.toLowerCase() === searchTerm.toLowerCase()
                    );
                    if (exactMatch) {
                      addToCart(exactMatch);
                      setSearchTerm("");
                    }
                  }
                }}
              />
           </div>
        </div>

        <ScrollArea className="flex-1">
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
              {filteredProducts.map(p => (
                <Card 
                  key={p.id} 
                  className="cursor-pointer border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all active:scale-95 group overflow-hidden bg-white relative"
                >
                  <div 
                    className="absolute top-2 right-2 z-10 p-2 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductInfo(p);
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <CardContent onClick={() => addToCart(p)} className="p-3 xl:p-4 flex flex-col justify-between h-auto min-h-[120px]">
                    <div className="flex justify-between items-start">
                       <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-xs xl:text-base uppercase">{p.sku?.substring(0,8) || "N/A"}</Badge>
                       {p.es_fraccionado && <Scale className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-amber-500" />}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm xl:text-base line-clamp-2 leading-tight mt-1 xl:mt-2 group-hover:text-emerald-700 transition-colors">
                       <span>{p.nombre}</span>
                    </h3>
                    <div className="flex justify-between items-end mt-2">
                       <div className="flex flex-col gap-0.5">
                         <span className={cn(
                           "text-[9px] xl:text-[10px] font-black uppercase",
                           (p.stock_minimo || 0) > 0 && (p.stock_actual || 0) <= (p.stock_minimo || 0) 
                             ? "text-rose-600 animate-pulse" 
                             : "text-slate-400"
                         )}>
                            Stock: <span>{p.stock_actual || 0}</span>
                         </span>
                         {p.precio_minimo > 0 && (
                           <span className="text-sm font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 mt-1 inline-block">
                             PISO: <span>{formatCurrency(p.precio_minimo)}</span>
                           </span>
                         )}
                       </div>
                       <span className="font-extrabold text-lg xl:text-xl text-slate-900 leading-none">
                          <span>{formatCurrency(p.precio_venta)}</span>
                       </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {!searchTerm && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 mb-6 relative">
                   <div className="absolute inset-0 bg-emerald-100 rounded-full animate-pulse opacity-50" />
                   <BrainCircuit className="absolute inset-0 m-auto w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-800">IA Inteligencia Saludable</h3>
                <p className="text-sm font-bold text-slate-500 mt-2 max-w-xs">Escribe un síntoma ("dolor"), un beneficio ("energía") o escanea un producto para prescribir.</p>
              </div>
            )}
            {searchTerm && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Package className="w-16 h-16 mb-4 text-slate-300" />
                <h3 className="text-xl font-black tracking-tight text-slate-600">No hay resultados</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">Busca por nombre, SKU, beneficio o síntoma.</p>
              </div>
            )}
        </ScrollArea>
      </div>

      {/* SECCIÓN DERECHA: CARRITO Y ACCIONES */}
      <div className="w-full xl:w-[480px] 2xl:w-[550px] flex flex-col gap-3 xl:gap-4 shrink-0 h-[50vh] xl:h-[calc(100vh-5rem)] xl:sticky xl:top-0 self-start">
        <Card className="flex-1 flex flex-col border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white min-h-0">
          <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
               <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-md shadow-emerald-100">
                  <ShoppingCart className="w-4 h-4" />
               </div>
               <h2 className="text-lg font-black text-slate-800">Checkout</h2>
            </div>
            <Button variant="ghost" size="default" className="text-white bg-rose-500 font-bold hover:bg-rose-600 px-4 rounded-xl uppercase tracking-widest text-xs" onClick={() => setCart([])}>Vaciar</Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <div className="p-3 space-y-2" key={cart.length === 0 ? "empty" : "items"}>
               {cart.length > 0 ? (
                   cart.map((item) => (
                    <div key={`cart-item-${item.id}`} className="flex flex-col gap-2 p-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-emerald-200 transition-colors">
                       {/* Item Name + Delete */}
                       <div className="flex justify-between items-start gap-2">
                          <p className="font-black text-slate-800 text-sm leading-tight flex-1">
                             <span>{item.nombre}</span>
                          </p>
                          <X className="w-5 h-5 text-slate-300 hover:text-rose-500 cursor-pointer flex-shrink-0" onClick={() => setCart(prev => applyPromotions(prev.filter(i => i.id !== item.id)))} />
                       </div>
                       <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                             <Button variant="ghost" size="icon" className="h-8 w-8 xl:h-10 xl:w-10 rounded-lg bg-white shadow-sm border border-slate-100" onClick={() => updateQty(item.id, -1)}><Minus className="w-3 h-3 xl:w-4 xl:h-4" /></Button>
                             <span className="w-8 xl:w-12 text-center font-black text-slate-700 text-lg xl:text-xl leading-none">
                                <span>{item.qty}</span>
                             </span>
                             <Button variant="ghost" size="icon" className="h-8 w-8 xl:h-10 xl:w-10 rounded-lg bg-white shadow-sm border border-slate-100" onClick={() => updateQty(item.id, 1)}><Plus className="w-3 h-3 xl:w-4 xl:h-4" /></Button>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 justify-center mt-1">
                              <div className="flex items-center gap-1.5 flex-wrap justify-end w-full">
                                 {item.precio_minimo > 0 && (
                                    <button 
                                       onClick={() => applyFloorPrice(item.id)}
                                       className={cn("px-1.5 py-0.5 text-[9px] font-black rounded border transition-colors uppercase whitespace-nowrap", item.isFloorPriceApplied ? "bg-rose-600 text-white border-rose-600" : "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-600 hover:text-white")}
                                    >
                                       MÍN: {formatCurrency(item.precio_minimo)}
                                    </button>
                                 )}
                                 <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">DTO%:</span>
                                    <input
                                       type="text"
                                       inputMode="decimal"
                                       value={item.isFloorPriceApplied ? "" : (item.manualDiscountPercent === undefined ? (Number(item.descuento || 0)) : item.manualDiscountPercent)}
                                       placeholder={item.isFloorPriceApplied ? "PISO" : "0"}
                                       onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                                       className="w-10 h-5 rounded border border-slate-200 text-xs font-bold text-center focus:ring-rose-500 focus:border-rose-500 bg-white p-0 placeholder:text-[9px] placeholder:text-rose-400 placeholder:font-black"
                                    />
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] xl:text-xs text-slate-400 font-bold uppercase line-through opacity-50 mb-0.5">
                                    <span>{formatCurrency(item.precio_venta * item.qty)}</span>
                                 </p>
                                 <p className="text-base xl:text-lg font-black text-emerald-700 leading-none">
                                    <span>{formatCurrency((item.precio_venta * item.qty) - item.discount)}</span>
                                 </p>
                              </div>
                           </div>
                       </div>
                    </div>
                  ))
               ) : (
                  <div className="flex flex-col items-center justify-center py-16 opacity-20 group">
                     <div className="p-8 bg-slate-100 rounded-full mb-4 group-hover:bg-emerald-50 transition-colors">
                        <ShoppingCart className="w-16 h-16 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                     </div>
                     <p className="font-black text-slate-400 italic text-sm">Carro Vacío</p>
                  </div>
               )}
            </div>
          </div>

          <div className="p-3 bg-slate-50/50 border-t border-slate-100 space-y-2 shrink-0">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-all cursor-pointer shadow-sm" onClick={() => setIsClientSearchOpen(true)}>
               <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg transition-all", selectedClient ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}>
                     <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                     <span className={cn("text-xs font-black uppercase tracking-tight", selectedClient ? "text-slate-800" : "text-slate-400")}>
                        {selectedClient ? selectedClient.nombre : "Venta General"}
                     </span>
                     <span className="text-[10px] font-bold text-slate-400">
                        {selectedClient ? `DOC: ${selectedClient.documento || "???"}` : "Toca para vincular"}
                     </span>
                  </div>
               </div>
               <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 rounded-md"
                  onClick={(e) => { e.stopPropagation(); setIsNewClientOpen(true); }}
               >
                  <Plus className="w-3 h-3" />
               </Button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-500 text-sm font-bold">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-rose-500 text-sm font-bold">
                  <span>Descuentos</span><span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-slate-900 font-black text-xl">Total</span>
                <span className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button 
               disabled={cart.length === 0}
               onClick={() => {
                 if (!activeSession) {
                   router.push("/caja" as any);
                   return;
                 }
                 setIsPaymentOpen(true);
               }}
               className={cn(
                 "w-full h-14 rounded-xl text-lg font-black shadow-lg shadow-emerald-200 transition-all active:scale-95 uppercase tracking-widest",
                 activeSession 
                   ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                   : "bg-slate-900 hover:bg-slate-800 text-white"
               )}
            >
               {cart.length === 0 ? "Carro Vacío" : activeSession ? "Pagar Ahora" : "Abrir Caja"}
            </Button>
          </div>
        </Card>
      </div>

      {/* DIALOGO DE PAGO */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
         <DialogContent className="!max-w-4xl !w-[95vw] rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white text-slate-900">
            <div className="w-full flex flex-col max-h-[85vh]">
            {/* CABECERA COMPACTA PREMUM */}
            <div className="bg-emerald-600 p-5 text-white flex justify-between items-center relative overflow-hidden">
               <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-[1.25rem] backdrop-blur-md">
                     <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                     <DialogTitle className="text-2xl font-black text-white leading-tight">Finalizar Venta</DialogTitle>
                     <p className="text-emerald-100 font-bold text-base uppercase opacity-70 tracking-widest mt-0.5">Gestión de Cobro Segura</p>
                  </div>
               </div>
               <div className="relative z-10 flex gap-10 items-center">
                  <div className="h-10 w-[1px] bg-white/10" />
                  <div className="text-right">
                     <p className="font-black opacity-60 uppercase tracking-[0.2em] text-xs mb-1">TOTAL TRANSACCIÓN</p>
                     <p className="text-4xl font-black tracking-tighter leading-none">{formatCurrency(total)}</p>
                  </div>
               </div>
               <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/30 rounded-full blur-[80px] pointer-events-none" />
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
               {/* SIDEBAR IZQUIERDO: CONFIGURACIÓN (280px) */}
               <div className="w-full lg:w-72 bg-slate-50 border-r border-slate-100 p-6 space-y-6 flex flex-col shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.03)] overflow-y-auto">
                  <div className="space-y-3">
                     <Label className="font-black text-slate-400 uppercase text-base tracking-[0.2em] ml-1">Modo de Pago</Label>
                     <div className="relative group">
                        <select 
                           className="w-full h-14 pl-5 pr-10 border-2 border-slate-200 bg-white rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-black text-slate-800 transition-all shadow-sm outline-none appearance-none cursor-pointer group-hover:border-slate-300"
                           value={paymentType}
                           onChange={(e) => setPaymentType(e.target.value as any)}
                        >
                           <option value="single">💳 Pago Único</option>
                           <option value="mixed">🧩 Pago Mixto</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-500 transition-colors">
                           <Plus className="w-4 h-4 rotate-45" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6 flex-1">
                     <div className="space-y-3">
                        <Label className="font-black text-slate-400 uppercase text-base tracking-[0.2em] ml-1">Seleccionar Método</Label>
                        <div className="grid grid-cols-1 gap-3">
                           <button 
                              onClick={() => setSelectedMethod("efectivo")}
                              className={cn(
                                 "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all w-full text-left font-black text-sm uppercase tracking-tight shadow-sm",
                                 selectedMethod === "efectivo" ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-100" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                              )}
                           >
                              <Banknote className="w-5 h-5" /> Efectivo
                           </button>
                           <button 
                              onClick={() => setSelectedMethod("tarjeta")}
                              className={cn(
                                 "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all w-full text-left font-black text-sm uppercase tracking-tight shadow-sm",
                                 selectedMethod === "tarjeta" ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-100" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                              )}
                           >
                              <CreditCard className="w-5 h-5" /> Tarjeta
                           </button>
                           <button 
                              onClick={() => setSelectedMethod("transferencia")}
                              className={cn(
                                 "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all w-full text-left font-black text-sm uppercase tracking-tight shadow-sm",
                                 selectedMethod === "transferencia" ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-100" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                              )}
                           >
                              <Smartphone className="w-5 h-5" /> Digital
                           </button>
                           <button 
                              disabled={!selectedClient}
                              onClick={() => setSelectedMethod("credito_cliente")}
                              className={cn(
                                 "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all w-full text-left font-black text-sm uppercase tracking-tight shadow-sm",
                                 selectedMethod === "credito_cliente" ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-100" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200",
                                 !selectedClient && "opacity-30 cursor-not-allowed border-dashed"
                              )}
                           >
                              <Wallet className="w-5 h-5" /> Fiado/Crédito
                           </button>
                        </div>
                     </div>
                  </div>

                  {selectedClient && (
                     <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                           <p className="font-extrabold text-xs uppercase tracking-widest text-emerald-400 mb-2">Cliente Asociado</p>
                           <p className="font-black text-sm leading-tight group-hover:text-emerald-300 transition-colors uppercase">{selectedClient.nombre}</p>
                           <p className="text-base font-bold opacity-50 mt-2">DOC: {selectedClient.documento || "CC ??????"}</p>
                        </div>
                        <User className="absolute -right-4 -bottom-4 w-16 h-16 text-white/5 rotate-12" />
                     </div>
                  )}
               </div>

               {/* ÁREA PRINCIPAL: ACCIÓN DINÁMICA */}
               <div className="flex-1 p-8 bg-white flex flex-col overflow-y-auto">
                  <Tabs value={paymentType} onValueChange={(v:any) => setPaymentType(v)} className="w-full flex-1 flex flex-col">
                     {/* El Listado desaparece de aqui y se maneja por el select */}
                     <TabsContent value="single" className="flex-1 animate-in fade-in slide-in-from-right-10 duration-500 mt-0 outline-none">
                        <div className="max-w-xl mx-auto space-y-12">
                           {selectedMethod === "efectivo" && (
                              <div className="space-y-8">
                                 <div className="text-center space-y-2 mt-6">
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Procesar Efectivo</h3>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Ingresa el monto entregado por el cliente</p>
                                 </div>

                                 <div className="relative group">
                                    <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-200 group-focus-within:text-emerald-500 transition-colors pointer-events-none">$</span>
                                    <Input 
                                       value={cashReceived}
                                       type="text"
                                       autoFocus
                                       inputMode="decimal"
                                       autoComplete="off"
                                       onFocus={(e) => e.target.select()}
                                       onChange={(e) => setCashReceived(formatNumberWithDots(e.target.value))}
                                       className="h-28 pl-16 !text-6xl font-black text-slate-900 border-2 border-slate-200 bg-white focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 rounded-[2rem] shadow-xl text-right pr-8 transition-all relative z-10 placeholder:text-slate-200 placeholder:opacity-50"
                                       placeholder="0"
                                    />
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] z-20 shadow-md">
                                       Esperando Entrada
                                    </div>
                                 </div>
                                 
                                 {parseFormattedNumber(cashReceived) >= total && (
                                    <div className="p-10 bg-slate-900 rounded-[3rem] flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-500 border border-white/5">
                                       <div>
                                          <div className="flex items-center gap-3 mb-1">
                                             <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                                             <p className="text-emerald-400 font-black text-base uppercase tracking-[0.2em]">Cálculo de Cambio</p>
                                          </div>
                                          <p className="text-white/60 font-medium text-xs italic">Monto exacto a devolver</p>
                                       </div>
                                       <span className="text-6xl font-black text-white tracking-tighter shadow-sm">
                                          {formatCurrency(parseFormattedNumber(cashReceived) - total)}
                                       </span>
                                    </div>
                                 )}
                              </div>
                           )}

                           {selectedMethod === "transferencia" && (
                              <div className="space-y-10">
                                 <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Transferencia Electrónica</h3>
                                    <p className="text-emerald-600 font-black text-xs uppercase tracking-widest opacity-60">Selecciona el banco destino para visualizar el comprobante</p>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {bankAccounts.map(b => (
                                       <div 
                                          key={b.id} 
                                          onClick={() => setSelectedBankId(b.id)}
                                          className={cn(
                                             "relative p-8 rounded-[2.5rem] border-3 cursor-pointer transition-all flex flex-col justify-between h-48 group overflow-hidden",
                                             selectedBankId === b.id 
                                                ? "bg-emerald-600 border-emerald-500 text-white shadow-2xl scale-[1.02]" 
                                                : "bg-slate-50 border-white text-slate-600 hover:border-emerald-200 hover:bg-white"
                                          )}
                                       >
                                          <div className="relative z-10 flex justify-between items-start">
                                             <div className={cn("p-3 rounded-2xl", selectedBankId === b.id ? "bg-white/20" : "bg-white shadow-sm")}>
                                                <Smartphone className={cn("w-6 h-6", selectedBankId === b.id ? "text-white" : "text-emerald-600")} />
                                             </div>
                                             {selectedBankId === b.id && <CheckCircle2 className="w-6 h-6 text-emerald-200 animate-in zoom-in" />}
                                          </div>
                                          <div className="relative z-10">
                                             <p className={cn("font-black text-xl mb-1 uppercase tracking-tight", selectedBankId === b.id ? "text-white" : "text-slate-900 group-hover:text-emerald-600")}>{b.nombre_banco}</p>
                                             <p className={cn("text-xs font-bold opacity-60 uppercase tracking-[0.2em]")}>{b.numero_cuenta}</p>
                                          </div>
                                          <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all duration-700" />
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {(selectedMethod === "tarjeta" || selectedMethod === "credito_cliente") && (
                              <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 border-dashed animate-in fade-in duration-700 mx-auto w-full max-w-lg">
                                 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-8 relative">
                                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping duration-[2000ms]" />
                                    {selectedMethod === 'tarjeta' ? <CreditCard className="w-12 h-12 text-slate-400 group-hover:text-emerald-500 transition-colors relative z-10" /> : <ShieldCheck className="w-10 h-10 text-emerald-500 relative z-10" />}
                                 </div>
                                 <h4 className="font-black text-slate-800 text-2xl tracking-tighter mb-2 text-center uppercase">Registro de {selectedMethod === 'tarjeta' ? 'Tarjeta' : 'Crédito'}</h4>
                                 <p className="text-slate-500 font-bold text-center text-sm max-w-sm px-4 leading-relaxed opacity-60">
                                    {selectedMethod === 'tarjeta' ? 'Pasa la tarjeta por el datáfono externo y confirma el éxito de la operación.' : 'El monto se cargará automáticamente al cupo disponible del cliente.'}
                                 </p>
                              </div>
                           )}
                        </div>
                     </TabsContent>

                     <TabsContent value="mixed" className="flex-1 animate-in fade-in slide-in-from-right-10 duration-500 mt-0 outline-none flex flex-col gap-6">
                        {/* HEADER DE SALDO COMPACTO Y ELEGANTE */}
                        <div className="bg-slate-900 p-8 rounded-[2rem] relative overflow-hidden shadow-xl border border-white/10 flex items-center justify-between">
                           <div className="relative z-10 space-y-1">
                              <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em]">
                                 <span>DEUDA PENDIENTE</span>
                              </p>
                              <p className="text-white/40 font-medium text-[10px] uppercase tracking-wider">
                                 <span>Total Transacción: {formatCurrency(total)}</span>
                              </p>
                           </div>
                           <div className="relative z-10 text-right">
                              <span className={cn(
                                 "text-5xl font-black tracking-tighter tabular-nums block transition-colors",
                                 (total - mixedPayments.reduce((acc, p) => acc + p.amount, 0)) <= 0 ? "text-emerald-500" : "text-white"
                              )}>
                                 <span>{formatCurrency(Math.max(0, total - mixedPayments.reduce((acc, p) => acc + p.amount, 0)))}</span>
                              </span>
                           </div>
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px]" />
                        </div>

                        {/* CUERPO CENTRAL: DISTRIBUCIÓN 4/8 */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
                           {/* PANEL DE ACCIÓN (ANCHO 5) */}
                           <div className="xl:col-span-5 flex flex-col gap-4">
                              <div className="flex-1 bg-slate-50/50 rounded-[2rem] border-2 border-slate-100 p-8 flex flex-col items-center justify-center gap-6 shadow-inner">
                                 <div className="text-center space-y-2">
                                    <h4 className="text-slate-800 font-black text-xl uppercase tracking-tight"><span>Registrar Abono</span></h4>
                                    <Badge variant="secondary" className="bg-white text-emerald-600 border-slate-200 px-4 py-1 font-bold text-[10px] uppercase tracking-widest">
                                       <span>MODO: {selectedMethod}</span>
                                    </Badge>
                                 </div>

                                 <div className="w-full max-w-[280px] space-y-4">
                                    {selectedMethod === 'transferencia' && (
                                       <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cuenta de Destino</Label>
                                          <Select value={selectedBankId} onValueChange={(val: string | null) => setSelectedBankId(val || "")}>
                                             <SelectTrigger className="h-12 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 w-full px-4">
                                                <SelectValue>
                                                   {bankAccounts.find(a => a.id === selectedBankId)?.nombre_banco || "Seleccionar cuenta"}
                                                </SelectValue>
                                             </SelectTrigger>
                                             <SelectContent>
                                                {bankAccounts.length > 0 ? (
                                                   bankAccounts.map(acc => (
                                                      <SelectItem key={acc.id} value={acc.id} className="font-medium">
                                                         {acc.nombre_banco || acc.nombre}
                                                      </SelectItem>
                                                   ))
                                                ) : (
                                                   <SelectItem value="none" disabled>No hay cuentas configuradas</SelectItem>
                                                )}
                                             </SelectContent>
                                          </Select>
                                       </div>
                                    )}

                                    <div className="relative group">
                                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-300 group-focus-within:text-emerald-600 transition-colors">$</span>
                                       <Input 
                                          value={cashReceived}
                                          type="text"
                                          inputMode="decimal"
                                          autoComplete="off"
                                          onChange={(e) => setCashReceived(formatNumberWithDots(e.target.value))}
                                          className="h-16 pl-10 pr-4 font-black text-3xl border-2 border-slate-200 bg-white focus:ring-emerald-500 rounded-2xl text-right transition-all shadow-sm"
                                          placeholder="0"
                                       />
                                    </div>
                                    <Button 
                                       onClick={() => {
                                          const amount = parseFormattedNumber(cashReceived);
                                          if (amount > 0) {
                                             const foundBank = bankAccounts.find(a => a.id === selectedBankId);
                                             const accountName = selectedMethod === 'transferencia' 
                                                ? (foundBank?.nombre_banco || foundBank?.nombre || 'Digital')
                                                : undefined;
                                             
                                             setMixedPayments([...mixedPayments, { 
                                                method: selectedMethod, 
                                                amount,
                                                accountName
                                             }]);
                                             setCashReceived("");
                                          }
                                       }}
                                       className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3 text-lg uppercase tracking-tight group"
                                    >
                                       <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" /> 
                                       <span>Añadir Pago</span>
                                    </Button>
                                 </div>
                              </div>
                           </div>

                           {/* PANEL DE DETALLE (ANCHO 7) */}
                           <div className="xl:col-span-7 bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col shadow-sm">
                              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-50">
                                 <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">HISTORIAL DE ABONOS RECIBIDOS</h4>
                                 </div>
                                 <Badge className="bg-slate-100 text-slate-600 border-none px-3 py-1 font-bold text-xs rounded-lg uppercase">
                                    <span>{mixedPayments.length} Items</span>
                                 </Badge>
                              </div>

                              {mixedPayments.length > 0 ? (
                                 <ScrollArea className="flex-1 pr-4">
                                    <div className="space-y-3">
                                       {mixedPayments.map((p, idx) => (
                                          <div key={`mixed-p-${idx}`} className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl group hover:border-emerald-200 hover:bg-emerald-50/20 transition-all">
                                             <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                                                   {p.method === 'efectivo' && <Banknote className="w-5 h-5" />}
                                                   {p.method === 'tarjeta' && <CreditCard className="w-5 h-5" />}
                                                   {p.method === 'transferencia' && <Smartphone className="w-5 h-5" />}
                                                   {p.method === 'credito_cliente' && <Wallet className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                   <p className="font-bold text-slate-800 text-xs uppercase"><span>{p.method}</span></p>
                                                   <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                                                      <span>{p.accountName ? `Cuenta: ${p.accountName}` : 'Recibo Confirmado'}</span>
                                                   </p>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-4">
                                                <span className="font-black text-slate-900 text-lg tabular-nums tracking-tighter"><span>{formatCurrency(p.amount)}</span></span>
                                                <Button size="icon" variant="ghost" onClick={() => setMixedPayments(mixedPayments.filter((_, i) => i !== idx))} className="h-8 w-8 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                   <Trash2 className="w-4 h-4" />
                                                </Button>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </ScrollArea>
                              ) : (
                                 <div className="flex flex-col items-center justify-center flex-1 opacity-20 py-10">
                                    <Receipt className="w-16 h-16 text-slate-300 mb-4" />
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest text-center max-w-[200px]">Sin abonos registrados aún</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </TabsContent>
                  </Tabs>
               </div>
            </div>

             <DialogFooter className="p-10 bg-slate-50 border-t border-slate-100">
                <Button 
                   variant="ghost" 
                   onClick={() => setIsPaymentOpen(false)} 
                   className="h-16 px-10 font-black text-slate-400 hover:text-slate-600 transition-all uppercase text-xs tracking-widest"
                >
                   Cancelar
                </Button>
                <Button 
                   onClick={handleCharge}
                   disabled={isProcessing || (paymentType === 'mixed' && mixedPayments.reduce((acc, p) => acc + p.amount, 0) < total)}
                   className="h-16 px-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-[1.5rem] shadow-2xl shadow-emerald-100 flex gap-4 text-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                   {isProcessing ? "Procesando..." : <><Printer className="w-6 h-6" /> NOTIFICAR Y COBRAR</>}
                </Button>
             </DialogFooter>
            </div>
         </DialogContent>
      </Dialog>

      {/* DIALOGO BUSQUEDA CLIENTES */}
      <Dialog open={isClientSearchOpen} onOpenChange={setIsClientSearchOpen}>
         <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
               <DialogTitle>Vincular Cliente</DialogTitle>
               <DialogDescription>Indispensable para crédito/fiado.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                     placeholder="Buscar por nombre o cédula..." 
                     className="pl-10 h-12 rounded-xl text-lg" 
                     autoComplete="off"
                     autoCorrect="off"
                     spellCheck={false}
                     onChange={(e) => fetchClients(e.target.value)} 
                  />
               </div>
               <div className="divide-y divide-slate-100">
                  {clients.map(c => (
                     <div 
                        key={c.id} 
                        onClick={() => { setSelectedClient(c); setIsClientSearchOpen(false); }}
                        className="p-3 hover:bg-emerald-50 cursor-pointer rounded-lg transition-colors flex justify-between items-center"
                     >
                        <div>
                           <p className="font-bold text-slate-800">{c.nombre}</p>
                           <p className="text-base text-slate-400 font-bold uppercase">{c.documento || "CC ??????"}</p>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-500" />
                     </div>
                  ))}
               </div>
            </div>
         </DialogContent>
      </Dialog>

      {/* DIALOGO CREAR CLIENTE */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
         <DialogContent className="w-[95vw] sm:w-[95vw] sm:max-w-[95vw] md:max-w-6xl lg:max-w-7xl max-h-[95vh] p-0 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border-none overflow-hidden flex flex-col">
            <div className="p-8 pb-0 flex items-center justify-between">
               <div className="space-y-1">
                  <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                     <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100">
                        <Users className="w-6 h-6" />
                     </div>
                     Perfil Integral Cliente
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-black text-sm uppercase tracking-widest pl-1">
                     Fidelización | Créditos | Inteligencia CRM
                  </DialogDescription>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsNewClientOpen(false)} className="rounded-2xl h-12 w-12 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <X className="w-6 h-6" />
               </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 pt-6">
               <CustomerForm 
                  onSave={() => { setIsNewClientOpen(false); fetchClients(""); }} 
                  onCancel={() => setIsNewClientOpen(false)} 
               />
            </div>
         </DialogContent>
      </Dialog>

      {/* DIALOGO DE ÉXITO */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-md rounded-[3rem] border-none shadow-[0_45px_150px_-25px_rgba(16,185,129,0.3)] p-0 overflow-hidden bg-white">
          <div className="flex flex-col items-center text-center">
            {/* Header Success */}
            <div className="w-full bg-emerald-600 p-10 flex flex-col items-center gap-4 relative overflow-hidden">
               <div className="relative z-10 w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-12 h-12 text-white" />
               </div>
               <div className="relative z-10">
                  <h2 className="text-3xl font-black text-white leading-tight">¡Venta Exitosa!</h2>
                  <p className="text-emerald-100 font-bold uppercase text-base tracking-[0.2em] mt-2 opacity-80">Procesado Correctamente</p>
               </div>
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="p-8 w-full space-y-8">
               <div className="space-y-1">
                  <p className="text-base font-black text-slate-400 uppercase tracking-widest">Monto Total Cobrado</p>
                  <p className="text-5xl font-black text-slate-900 tracking-tighter">{formatCurrency(lastVenta?.total || 0)}</p>
               </div>

               {lastVenta?.payment_type !== 'mixto' && selectedMethod === 'efectivo' && lastVenta?.change > 0 && (
                  <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-100/50">
                     <p className="text-base font-black text-amber-600 uppercase tracking-widest mb-1">Cambio a Entregar (Vueltas)</p>
                     <p className="text-3xl font-black text-amber-700 tracking-tighter">{formatCurrency(lastVenta.change)}</p>
                  </div>
               )}

               <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => handlePrint()}
                    className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black flex gap-3 shadow-xl"
                  >
                    <Printer className="w-5 h-5" /> REIMPRIMIR TICKET
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsSuccessOpen(false)}
                    className="w-full h-14 text-emerald-600 font-black hover:bg-emerald-50 rounded-2xl"
                  >
                    NUEVA VENTA
                  </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TICKET OCULTO PARA IMPRESIÓN - Solo se monta si hay una venta activa para reducir huella en el DOM */}
      {isSuccessOpen && (
        <div className="fixed -left-[2000px] opacity-0 pointer-events-none">
           <ReceiptTicket 
              ref={receiptRef}
              tenant={tenant}
              items={lastVenta?.cart || []}
              subtotal={lastVenta?.subtotal || 0}
              totalDiscount={lastVenta?.totalDiscount || 0}
              total={lastVenta?.total || 0}
              paymentMethod={lastVenta?.metodo_pago || "efectivo"}
              client={lastVenta?.client}
           />
        </div>
      )}
      {/* MODAL SABIDURÍA NATURISTA (IA) */}
      <Dialog open={!!selectedProductInfo} onOpenChange={() => setSelectedProductInfo(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-6xl lg:max-w-7xl max-h-[90vh] pb-0 mb-0 pt-0 mt-0 pr-0 pl-0 rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col">
          <div className="bg-emerald-600 p-6 xl:p-8 text-white relative overflow-hidden shrink-0">
             <div className="relative z-10 flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                   <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                   <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">{selectedProductInfo?.nombre}</h2>
                   <p className="text-emerald-100 font-bold mt-2 tracking-widest uppercase text-xs opacity-70">Sabiduría Naturista & Propiedades</p>
                </div>
             </div>
             <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/30 rounded-full blur-[60px]" />
          </div>

          <ScrollArea className="flex-1">
             <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                         <BrainCircuit className="w-5 h-5" />
                         <span className="font-black uppercase text-xs tracking-widest">Beneficios</span>
                      </div>
                      <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl">
                         <p className="text-slate-700 font-medium leading-relaxed">
                            {selectedProductInfo?.beneficios || "No se han registrado beneficios específicos para este producto."}
                         </p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-rose-500 mb-1">
                         <AlertTriangle className="w-5 h-5" />
                         <span className="font-black uppercase text-xs tracking-widest">Síntomas que alivia</span>
                      </div>
                      <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-3xl">
                         <p className="text-slate-700 font-medium leading-relaxed">
                            {selectedProductInfo?.sintomas_alivia || "No se han detallado los síntomas asociados."}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <Boxes className="w-5 h-5" />
                      <span className="font-black uppercase text-xs tracking-widest">Ingredientes / Composición</span>
                   </div>
                   <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                      <p className="text-slate-600 font-bold leading-relaxed italic">
                         {selectedProductInfo?.ingredientes || "Información de composición pendiente de registro."}
                      </p>
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <Button 
                      variant="ghost"
                      onClick={() => setSelectedProductInfo(null)}
                      className="flex-1 h-14 rounded-2xl text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest"
                   >
                      Regresar
                   </Button>
                   <Button 
                      onClick={() => {
                         if (selectedProductInfo) {
                           addToCart(selectedProductInfo);
                           setSelectedProductInfo(null);
                           // Desplazar al carrito en móviles
                           if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                              const cartEl = document.querySelector('.xl\\:sticky');
                              cartEl?.scrollIntoView({ behavior: 'smooth' });
                           }
                         }
                      }}
                      className="flex-2 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg shadow-emerald-100 px-8 flex items-center gap-3"
                   >
                      <ShoppingCart className="w-5 h-5" />
                      AGREGAR AL CARRITO DE COMPRAS
                   </Button>
                </div>
             </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentTypeBtn({ active, onClick, icon, label, disabled }: any) {
   return (
      <button 
         type="button"
         disabled={disabled}
         onClick={onClick}
         className={cn(
            "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all gap-4 ring-offset-white",
            active 
               ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-[0_10px_30px_-5px_rgba(16,185,129,0.3)] scale-105" 
               : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50/50",
            disabled && "opacity-20 cursor-not-allowed filter grayscale"
         )}
      >
         <span className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all", 
            active ? "bg-emerald-600 text-white rotate-6" : "bg-slate-50 text-slate-400 group-hover:scale-110"
         )}>
            {React.cloneElement(icon, { size: 28 })}
         </span>
         <span className="text-base font-black uppercase tracking-[0.2em]">{label}</span>
      </button>
   );
}
