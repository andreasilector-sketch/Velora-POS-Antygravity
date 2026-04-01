"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { BrainCircuit, Package, X, Scale, Edit, Search } from "lucide-react";

export function GlobalScanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant } = useUserProfile();
  const supabase = createClient();
  
  const [buffer, setBuffer] = useState("");
  const [lastTime, setLastTime] = useState(0);
  
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      const target = e.target as HTMLElement;
      // Allow if we are not in an input, or if it's a barcode capture input
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput && !target.classList.contains('barcode-capture')) {
        return;
      }

      setLastTime(prevTime => {
        const currentTime = Date.now();
        const timeDiff = currentTime - prevTime;
        
        if (timeDiff > 50) {
          // Si pasó más de 50ms, asumir que es tecleo manual e iniciar nuevo buffer
          setBuffer(e.key.length === 1 ? e.key : "");
        } else {
          // Si es rápido (lector)
          if (e.key === 'Enter') {
            setBuffer(currentBuffer => {
              if (currentBuffer.length > 2) {
                // Emitir evento global y procesar
                handleBarcode(currentBuffer);
              }
              return "";
            });
          } else if (e.key.length === 1) {
             setBuffer(prev => prev + e.key);
          }
        }
        return currentTime;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pathname, tenant]); // tenant needed so handleBarcode has context

  const handleBarcode = async (code: string) => {
    if (!tenant) return;
    
    // Disparar evento global para que POS u otras vistas puedan suscribirse y actuar
    const event = new CustomEvent('global-barcode-scanned', { detail: { barcode: code } });
    window.dispatchEvent(event);

    if (pathname === '/pos') {
      // Si estamos en POS, la página de POS escuchará el evento "global-barcode-scanned"
      // o igual la propia página ya añade el producto a través de su estado. 
      // Por ende, no mostramos el panel modal aquí para no interrumpir el flujo.
      return; 
    }

    // Fuera de POS: Buscar producto y mostrar Panel de Consulta
    setIsLoading(true);
    setIsModalOpen(true);
    setBarcodeNotFound("");
    
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`*, categorias(nombre)`)
        .eq('tenant_id', tenant.id)
        .or(`codigo_barras.eq.${code},sku.eq.${code}`)
        .maybeSingle();

      if (data) {
        setScannedProduct(data);
      } else {
        setScannedProduct(null);
        setBarcodeNotFound(code);
      }
    } catch (err) {
      console.error(err);
      setScannedProduct(null);
    } finally {
      setIsLoading(false);
    }
  };

  const irAInventario = () => {
    setIsModalOpen(false);
    if (scannedProduct) {
      // Redirigir a inventario para modificar este producto
      router.push(`/products`);
    } else {
      router.push(`/products`);
    }
  };

  const preguntarIA = () => {
    // Abrir un prompt a IA
    alert(`Consultando a Inteligencia Saludable: ¿Para qué sirve el producto: ${scannedProduct?.nombre}? \n\n(Este módulo se abrirá aquí)`);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-md bg-white border-0 rounded-[2.5rem] shadow-[0_35px_120px_-20px_rgba(0,0,0,0.4)] overflow-hidden p-0">
        <div className="relative">
          {/* Header */}
          <div className="bg-emerald-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
             <div className="relative z-10 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-[1.25rem] backdrop-blur-md">
                   <Search className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black text-white leading-tight">Consulta Rápida</DialogTitle>
                   <p className="text-emerald-100 font-bold text-[10px] uppercase tracking-widest mt-0.5">Escáner Global Activo</p>
                </div>
             </div>
             <DialogClose className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
               <X className="w-5 h-5" />
             </DialogClose>
             <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/30 rounded-full blur-[80px] pointer-events-none" />
          </div>

          <div className="p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                 <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                 <p className="font-black text-slate-400 text-xs uppercase tracking-widest animate-pulse">Buscando en Inventario...</p>
              </div>
            ) : scannedProduct ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                   <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest text-[10px] border-emerald-100">{scannedProduct.sku || scannedProduct.codigo_barras || "S/N"}</Badge>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{scannedProduct.nombre}</h3>
                   <div className="flex justify-center items-center gap-2 mt-2">
                     <span className="font-black text-slate-900 text-3xl">{formatCurrency(scannedProduct.precio_venta)}</span>
                     {scannedProduct.es_fraccionado && <Scale className="w-5 h-5 text-amber-500" />}
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-inner">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Actual</span>
                     <span className={`text-xl font-black ${(scannedProduct.stock_actual || 0) <= (scannedProduct.stock_minimo || 0) ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
                       {scannedProduct.stock_actual || 0}
                     </span>
                   </div>
                   <div className="flex flex-col text-right">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</span>
                     <span className="text-sm font-bold text-slate-600 uppercase">{scannedProduct.categorias?.nombre || "N/A"}</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    onClick={irAInventario} 
                    className="h-14 bg-white text-slate-600 border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-sm gap-2"
                  >
                    <Edit className="w-4 h-4" /> Modificar
                  </Button>
                  <Button 
                    onClick={preguntarIA} 
                    className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 gap-2 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <BrainCircuit className="w-4 h-4" /> IA Naturista
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Package className="w-10 h-10 text-rose-300" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Producto No Encontrado</h3>
                <p className="text-sm font-bold text-slate-500 px-4">El código <span className="text-rose-500">{barcodeNotFound}</span> no está registrado en el inventario.</p>
                <div className="pt-4">
                  <Button onClick={irAInventario} className="h-12 w-full bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg">Crear Nuevo Producto</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
