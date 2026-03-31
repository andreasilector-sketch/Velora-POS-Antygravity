"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Package,
  FileText,
  Target,
  Zap,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useUserProfile } from "@/hooks/use-user-profile";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { generatePDFReport } from "@/lib/reports";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { tenant, profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (tenant) {
      fetchReportData();
    }
  }, [tenant]);

  const fetchReportData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await (supabase.from("ventas" as any) as any)
      .select(`
        id,
        fecha,
        total,
        metodo_pago,
        clientes(nombre)
      `)
      .eq("tenant_id", tenant.id)
      .order("fecha", { ascending: false })
      .limit(50);
    
    if (data) setSalesSummary(data);
    setLoading(false);
  };

  const handleExportSales = async () => {
    if (!tenant || !profile) return;
    setExporting(true);
    
    const columns = ["ID", "Fecha", "Cliente", "Metodo", "Total"];
    const data = salesSummary.map(v => [
      v.id.substring(0,8),
      new Date(v.fecha).toLocaleDateString(),
      v.clientes?.nombre || "General",
      (v.metodo_pago || "Efectivo").toUpperCase(),
      formatCurrency(v.total)
    ]);

    generatePDFReport({
      title: "Reporte de Ventas",
      subtitle: `Resumen de las últimas ${salesSummary.length} transacciones.`,
      filename: "ventas_velora",
      columns,
      data,
      tenantName: (tenant as any).nombre_empresa,
      userName: (profile as any).nombre
    });
    
    setExporting(false);
  };

  const handleExportInventory = async () => {
     if (!tenant || !profile) return;
     setExporting(true);
     
     const { data: prods } = await (supabase.from("productos" as any) as any)
      .select("sku, nombre, precio_venta, stock_actual")
      .eq("tenant_id", tenant.id);
     
     if (prods) {
       const columns = ["SKU", "Producto", "Stock", "P. Venta"];
       const reportData = prods.map((p: any) => [
         p.sku || "N/A",
         p.nombre,
         p.stock_actual?.toString() || "0",
         formatCurrency(p.precio_venta)
       ]);

       generatePDFReport({
         title: "Inventario Físico",
         subtitle: `Catálogo completo de productos activos.`,
         filename: "inventario_velora",
         columns,
         data: reportData,
         tenantName: (tenant as any).nombre_empresa,
         userName: (profile as any).nombre
       });
     }
     setExporting(false);
  };

  if (loading) return <div className="p-20 text-center text-slate-400 font-black tracking-widest uppercase italic">Compilando Analítica...</div>;

  return (
    <div className="space-y-10 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
                <BarChart3 className="w-5 h-5" />
             </div>
             <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Business Intelligence</p>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">Reportes Financieros</h2>
          <p className="text-slate-500 font-medium">Análisis profundo de ventas y exportación de datos.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <Select defaultValue="mes_actual">
            <SelectTrigger className="w-[180px] border-none font-bold text-slate-600">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100">
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes_actual">Mes Actual</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-px h-8 bg-slate-100 mx-1" />
          <Button 
            disabled={exporting}
            onClick={handleExportSales}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-100 gap-2 rounded-xl"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
            EXPORTAR PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/30">
            <div>
              <CardTitle className="text-xl font-black text-slate-800">Exportar Inventario</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Genera una lista de precios y stock actual.</CardDescription>
            </div>
            <Package className="w-8 h-8 text-emerald-600 opacity-30" />
          </CardHeader>
          <CardContent className="p-8 flex justify-center">
             <Button 
                variant="outline" 
                onClick={handleExportInventory}
                className="h-16 px-10 border-2 border-emerald-100 text-emerald-700 font-black rounded-2xl flex gap-3 hover:bg-emerald-50 transition-all active:scale-95"
             >
                <FileText className="w-6 h-6" /> GENERAR LISTA DE PRECIOS
             </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/30">
            <div>
              <CardTitle className="text-xl font-black text-slate-800">Libro de Ventas</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Historial detallado del periodo para contabilidad.</CardDescription>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600 opacity-30" />
          </CardHeader>
          <CardContent className="p-8">
             <div className="space-y-4">
                {salesSummary.slice(0, 3).map(v => (
                   <div key={v.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                         <p className="text-xs font-black text-slate-800 tracking-tighter">#{v.id.substring(0,8)}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(v.fecha).toLocaleDateString()}</p>
                      </div>
                      <span className="font-black text-emerald-600">{formatCurrency(v.total)}</span>
                   </div>
                ))}
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest pt-2">Total {salesSummary.length} registros cargados</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
