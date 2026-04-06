"use client";

import React, { useState, useRef } from "react";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function PrintStickerModal({ product, isOpen, onClose }: any) {
  const [quantity, setQuantity] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Stickers-${product?.nombre}`,
    onAfterPrint: () => {
      // Optional: auto-close after print
      // onClose();
    }
  });

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            Imprimir Stickers
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium pt-2">
            Impresión en formato etiqueta (50mm x 30mm) para <span className="font-bold text-slate-700">{product.nombre}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col gap-6">
          <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vista Previa (No a escala)</span>
             <div className="bg-white border-2 border-slate-200 shadow-sm rounded flex flex-col items-center justify-center p-2 text-center" style={{ width: '188px', height: '113px' }}>
                <p className="text-[10px] font-bold text-slate-800 leading-tight line-clamp-1 w-full text-center">
                  {product.nombre}
                </p>
                <p className="text-[8px] text-slate-500 italic mt-0.5 line-clamp-1 w-full text-center">
                  {product.categorias?.nombre || "General"}
                </p>
                <p className="font-black text-sm text-slate-900 mt-1">
                  {formatCurrency(product.precio_venta)}
                </p>
                {product.codigo_barras ? (
                   <div className="mt-1 scale-75 origin-top">
                     <Barcode value={product.codigo_barras} width={1.5} height={20} displayValue={false} margin={0} />
                   </div>
                ) : (
                   <div className="mt-1 text-[8px] text-slate-400 border border-dashed border-slate-300 p-1 rounded">Sin código</div>
                )}
             </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 block">Cantidad a imprimir</label>
            <div className="flex items-center gap-4">
               <Button onClick={() => setQuantity(Math.max(1, quantity - 1))} variant="outline" className="h-12 w-12 rounded-xl border-slate-200 text-slate-600 shadow-sm">
                 <Minus className="w-4 h-4" />
               </Button>
               <Input 
                 type="number" 
                 value={quantity} 
                 onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                 className="flex-1 h-12 text-center font-black text-xl rounded-xl border-slate-200 shadow-inner"
               />
               <Button onClick={() => setQuantity(quantity + 1)} variant="outline" className="h-12 w-12 rounded-xl border-slate-200 text-slate-600 shadow-sm">
                 <Plus className="w-4 h-4" />
               </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="h-11 px-6 rounded-xl font-bold">Cancelar</Button>
          <Button onClick={handlePrint} className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-200 flex items-center gap-2">
            <Printer className="w-4 h-4" /> IMPRIMIR {quantity}
          </Button>
        </div>
      </DialogContent>

      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <style>
            {`
              @media print {
                @page {
                  size: 50mm 30mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                }
              }
            `}
          </style>
          {Array.from({ length: quantity }).map((_, i) => (
            <div key={i} style={{
              width: '50mm',
              height: '30mm',
              pageBreakAfter: 'always',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: '2mm',
              gap: '1mm',
              backgroundColor: 'white',
              fontFamily: 'sans-serif'
            }}>
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: '10px', color: '#000', maxHeight: '20px', overflow: 'hidden' }}>
                  {product.nombre}
                </div>
                <div style={{ fontSize: '7px', fontWeight: 'normal', color: '#333', marginTop: '1px' }}>
                  {(product as any).categorias?.nombre || "General"}
                </div>
              </div>
              
              <div style={{ fontSize: '13px', fontWeight: '900', color: '#000', margin: '1px 0' }}>
                {formatCurrency(product.precio_venta)}
              </div>

              {product.codigo_barras ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Barcode value={product.codigo_barras} width={1.2} height={20} fontSize={8} margin={0} displayValue={true} />
                </div>
              ) : (
                <div style={{ fontSize: '8px', color: '#666', border: '1px dashed #ccc', padding: '2px 4px' }}>
                  Sin código
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
