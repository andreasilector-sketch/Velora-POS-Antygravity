"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

interface TicketProps {
  tenant: any;
  items: any[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  paymentMethod: string;
  client?: any;
}

export const ReceiptTicket = React.forwardRef<HTMLDivElement, TicketProps>(
  ({ tenant, items, subtotal, totalDiscount, total, paymentMethod, client }, ref) => {
    const config = tenant?.configuracion_pos || {};
    const [today, setToday] = React.useState("");

    React.useEffect(() => {
      setToday(new Date().toLocaleString());
    }, []);

    return (
      <div 
        ref={ref} 
        style={{ 
          width: "58mm", // Standard or 80mm
          padding: "5mm",
          backgroundColor: "white",
          color: "black",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "10pt",
          lineHeight: "1.2"
        }}
        className="receipt-print-container"
      >
        <style>{`
          @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0; }
            .receipt-print-container { width: 100% !important; }
          }
        `}</style>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "5mm" }}>
          {tenant?.logo_url && (
            <img 
              src={tenant.logo_url} 
              alt="Logo" 
              style={{ maxWidth: "40mm", height: "auto", marginBottom: "2mm", filter: "grayscale(1)" }} 
            />
          )}
          <div style={{ fontWeight: "bold", fontSize: "12pt", textTransform: "uppercase" }}>
            {tenant?.nombre_empresa || "VELORA POS"}
          </div>
          <div style={{ fontSize: "9pt" }}>
            NIT: {tenant?.nit || "N/A"}<br />
            {tenant?.direccion_fiscal || ""}<br />
            {tenant?.municipio || ""}, {tenant?.departamento || ""}<br />
            TEL: {tenant?.telefono || ""}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "2mm 0" }}></div>

        {/* DIAN Info */}
        <div style={{ fontSize: "8pt", textAlign: "center", marginBottom: "2mm" }}>
          Resolución DIAN: {config.resolucion_numero || "N/A"}<br />
          Prefijo: {config.resolucion_prefijo || ""} Del {config.resolucion_desde || "0"}<br />
          al {config.resolucion_hasta || "0"}<br />
          Vence: {config.resolucion_fecha_fin || ""}
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "2mm 0" }}></div>

        {/* Transaction Info */}
        <div style={{ fontSize: "9pt" }}>
          FECHA: {today}<br />
          CAJA: Principal<br />
          METODO: {paymentMethod.toUpperCase()}<br />
          {client && <div style={{ fontSize: "9pt" }}>CLIENTE: {client.nombre}</div>}
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "2mm 0" }}></div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>CAN</th>
              <th style={{ textAlign: "left" }}>DESCRIPCION</th>
              <th style={{ textAlign: "right" }}>SUB</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ verticalAlign: "top" }}>{item.qty}</td>
                <td>{item.nombre.substring(0, 15)}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(item.precio_venta * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed black", margin: "2mm 0" }}></div>

        {/* Totals */}
        <div style={{ fontSize: "10pt" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>SUBTOTAL:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>DESC:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "12pt", marginTop: "1mm" }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "4mm 0 2mm 0" }}></div>

        <div style={{ textAlign: "center", fontSize: "8pt", fontStyle: "italic" }}>
          GRACIAS POR SU COMPRA<br />
          Powered by VELORA
        </div>
        <div style={{ height: "10mm" }}></div> {/* Extra space for easier tear off */}
      </div>
    );
  }
);

ReceiptTicket.displayName = "ReceiptTicket";
