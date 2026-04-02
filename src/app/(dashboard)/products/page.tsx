"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Filter, 
  PackageSearch, 
  Activity, 
  DollarSign, 
  Download,
  Edit2,
  Trash2,
  Scale,
  BrainCircuit,
  Calendar
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatCurrency, normalizeText } from "@/lib/utils";
import { Database } from "@/lib/database.types";
import { ProductForm } from "./components/ProductForm";
import { cn } from "@/lib/utils";
import * as xlsx from 'xlsx';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Product = Database["public"]["Tables"]["productos"]["Row"];

export default function ProductsPage() {
  const { tenant } = useUserProfile();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(query || "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<{id: string, nombre: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (tenant) {
      fetchProducts();
      fetchCategories();
    }
  }, [tenant]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categorias").select("id, nombre").eq("tenant_id", tenant?.id as string);
    if (data) setAllCategories(data);
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

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) alert(error.message);
      else fetchProducts();
    }
  };

  const filteredProducts = products.filter((p: Product) => {
    const s = normalizeText(searchTerm);
    const matchesSearch = !searchTerm || 
      normalizeText(p.nombre).includes(s) || 
      normalizeText(p.sku || "").includes(s) ||
      normalizeText(p.codigo_barras || "").includes(s);
    
    const matchesCategory = selectedCategory === "all" || p.categoria_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    lowStock: products.filter((p: Product) => (p as any).stock_actual <= p.stock_minimo).length,
    value: products.reduce((acc: number, p: Product) => acc + (p.precio_compra * ((p as any).stock_actual || 0)), 0)
  };

  const handleExport = () => {
    // Generate a worksheet with the current data
    const ws = xlsx.utils.json_to_sheet(products.map((p: Product) => ({
      "Nombre": p.nombre,
      "SKU": p.sku,
      "Codigo_Barras": p.codigo_barras,
      "Categoria": (p as any).categorias?.nombre || "",
      "Precio_Compra": p.precio_compra,
      "Precio_Venta": p.precio_venta,
      "Precio_Minimo": p.precio_minimo,
      "Stock_Actual": (p as any).stock_actual || 0,
      "Stock_Minimo": p.stock_minimo,
      "Tipo_Item": (p as any).tipo_item || "Producto",
      "Unidad_Medida": (p as any).unidad_medida || "Unidad",
      "Impuesto_Porcentaje": (p as any).impuesto_porcentaje || 0,
      "Bodega": (p as any).bodega || "Principal",
      "Beneficios": p.beneficios || "",
      "Sintomas": p.sintomas_alivia || "",
      "Composicion": p.ingredientes || "",
      "Fecha_Vencimiento": p.fecha_vencimiento || ""
    })));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Inventario_Velora");
    xlsx.writeFile(wb, "Inventario_Velora.xlsx");
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      "nombre": "Ejemplo Producto",
      "sku": "REF-001",
      "codigo_barras": "1234567890",
      "categoria_maestro": allCategories[0]?.nombre || "General",
      "precio_compra": 10000,
      "precio_venta": 15000,
      "precio_minimo_piso": 14000,
      "unidad_medida": "Unidad",
      "stock_actual": 50,
      "stock_minimo": 10,
      "tipo_item": "Producto",
      "bodega": "Principal",
      "impuesto_porcentaje": 0,
      "beneficios": "Escribe aquí los beneficios...",
      "sintomas_alivia": "Escribe aquí qué alivia...",
      "ingredientes": "Lista de ingredientes...",
      "fecha_vencimiento": "2026-12-31"
    }];

    const ws = xlsx.utils.json_to_sheet(templateData);
    
    // Create a helper sheet for dropdown options hint
    const helperData = [
      { "DATO": "UNIDADES DE MEDIDA", "OPCIONES": "Unidad, Caja, Frasco, Sobre, Mililitros, Gramos, Tabletas, Capsulas" },
      { "DATO": "CATEGORÍAS DISPONIBLES", "OPCIONES": allCategories.map((c: any) => c.nombre).join(", ") || "Aún no has creado categorías en el módulo de Inventario > Categorías" }
    ];
    const wsHelper = xlsx.utils.json_to_sheet(helperData);

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Plantilla_Importacion");
    xlsx.utils.book_append_sheet(wb, wsHelper, "VALORES_PERMITIDOS");
    xlsx.writeFile(wb, "Plantilla_Velora_POS.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);

        if (data.length > 0) {
           // 0. Fetch current products to check conflicts
           const { data: dbProducts } = await supabase.from("productos").select("id, sku, codigo_barras, nombre").eq("tenant_id", tenant!.id);
           
           const updates: any[] = [];
           const inserts: any[] = [];
           const conflicts: string[] = [];

           data.forEach((row: any) => {
             const catName = row.categoria_maestro || row.Categoria || "";
             const category = allCategories.find((c: any) => normalizeText(c.nombre) === normalizeText(catName));
             
             const rowSku = String(row.sku || row.SKU || "").trim();
             const rowBarcode = String(row.codigo_barras || row.Codigo_Barras || "").trim();
             const rowNombre = row.nombre || row.Nombre;

             // Check if it exists in DB by SKU or Barcode
             const existing = dbProducts?.find((p: any) => 
                (rowSku && p.sku === rowSku) || 
                (rowBarcode && p.codigo_barras === rowBarcode)
             );

             const productData = {
               tenant_id: tenant!.id,
               nombre: rowNombre,
               sku: rowSku || null,
               codigo_barras: rowBarcode || null,
               categoria_id: category?.id || null,
               precio_compra: Number(row.precio_compra || row.Precio_Compra) || 0,
               precio_venta: Number(row.precio_venta || row.Precio_Venta) || 0,
               precio_minimo: Number(row.precio_minimo_piso || row.precio_minimo || row.Precio_Minimo || row.Piso) || 0,
               stock_actual: Number(row.stock_actual || row.Stock_Actual) || 0,
               stock_minimo: Number(row.stock_minimo || row.Stock_Minimo) || 5,
               tipo_precio: 'fijo',
               margen_ganancia: 0,
               es_fraccionado: false,
               factor_conversion: 1,
               tipo_item: row.tipo_item || row.Tipo_Item || 'Producto',
               unidad_medida: row.unidad_medida || row.Unidad_Medida || 'Unidad',
               bodega: row.bodega || row.Bodega || 'Principal',
               impuesto_porcentaje: Number(row.impuesto_porcentaje || row.Impuesto_Porcentaje) || 0,
               fecha_vencimiento: row.fecha_vencimiento || row.Fecha_Vencimiento || null,
               beneficios: row.beneficios || row.Beneficios || null,
               sintomas_alivia: row.sintomas_alivia || row.Sintomas || null,
               ingredientes: row.ingredientes || row.Composicion || null,
             };

             if (existing) {
                // Check if names match (Conflict test)
                if (normalizeText(existing.nombre) !== normalizeText(rowNombre)) {
                   conflicts.push(`Conflicto: El código ${rowSku || rowBarcode} ya pertenece a "${existing.nombre}" (Excel dice "${rowNombre}")`);
                } else {
                   updates.push({ ...productData, id: existing.id });
                }
             } else {
                inserts.push(productData);
             }
           });

           if (conflicts.length > 0) {
              if (!confirm(conflicts.join("\n") + "\n\n¿Deseas ignorar los conflictos e insertar el resto?")) {
                 setLoading(false);
                 return;
              }
           }
           
           // Perform Upserts/Inserts
           if (inserts.length > 0) {
              const { error: insErr } = await supabase.from("productos").insert(inserts);
              if (insErr) throw insErr;
           }
           if (updates.length > 0) {
              const { error: updErr } = await supabase.from("productos").upsert(updates);
              if (updErr) throw updErr;
           }
           
           alert(`Procesado: ${inserts.length} nuevos, ${updates.length} actualizados.`);
           fetchProducts();
        }
      } catch (err: any) {
        alert("Error procesando Excel: " + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 font-sans flex flex-col min-h-[calc(100vh-8rem)]">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] w-full max-h-[95vh] overflow-y-auto rounded-[3rem] border-none shadow-2xl p-0 bg-white">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
                  {selectedProduct ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                {selectedProduct ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm">
                Completa los datos técnicos y de conocimiento naturista para este producto.
              </DialogDescription>
            </DialogHeader>
            <ProductForm 
              product={selectedProduct} 
              onSave={() => {
                setIsDialogOpen(false);
                fetchProducts();
              }} 
              onCancel={() => setIsDialogOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Encabezado */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
            <PackageSearch className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventario Maestro</h2>
            <p className="text-sm text-slate-500 font-medium">Control multi-tenant y conocimiento naturista</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <input 
             type="file" 
             accept=".xlsx, .xls" 
             className="hidden" 
             ref={fileInputRef} 
             onChange={handleFileUpload} 
          />
          <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
            <Button onClick={handleDownloadTemplate} variant="ghost" className="h-11 px-4 text-emerald-600 font-bold hover:bg-emerald-50 rounded-xl">
              ↓ Plantilla XLS
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-11 px-4 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 shadow-sm rounded-xl">
              Subir Inventario
            </Button>
          </div>
          <Button onClick={handleExport} variant="outline" className="h-11 px-5 border-slate-200 text-slate-600 font-bold hover:bg-white shadow-sm rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Exportar a Excel
          </Button>
          <Button 
            onClick={() => {
              setSelectedProduct(null);
              setIsDialogOpen(true);
            }}
            className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 transition-all hover:-translate-y-0.5 rounded-xl ml-1"
          >
            <Plus className="w-5 h-5 mr-1" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:px-6 border-b border-slate-100">
        <CardStat 
          label="Productos Totales" 
          value={stats.total.toString()} 
          icon={<PackageSearch className="w-6 h-6"/>} 
          color="emerald" 
        />
        <CardStat 
          label="Alertas de Stock" 
          value={stats.lowStock.toString()} 
          icon={<Activity className="w-6 h-6"/>} 
          color="rose" 
        />
        <CardStat 
          label="Valor Inventario" 
          value={formatCurrency(stats.value)} 
          icon={<DollarSign className="w-6 h-6"/>} 
          color="teal" 
        />
      </div>

      {/* Barra de Búsqueda */}
        <div className="flex flex-col md:flex-row gap-3 items-center p-4 md:px-6 border-b border-slate-100 flex-shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <Input 
              className="pl-9 h-11 border-slate-200 bg-slate-50 focus:bg-white focus:ring-emerald-500 rounded-xl transition-all w-full" 
              placeholder="Buscar por nombre, SKU o código de barras..." 
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={(v: string | null) => setSelectedCategory(v || "all")}>
            <SelectTrigger className="w-full md:w-56 h-11 border-slate-200 bg-white rounded-xl shadow-sm font-bold text-slate-600">
               <Filter className="w-4 h-4 mr-2" />
               <SelectValue placeholder="Todas las Categorías" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
               <SelectItem value="all" className="font-bold">Todas las Categorías</SelectItem>
               {allCategories.map((cat: any) => (
                 <SelectItem key={cat.id} value={cat.id} className="font-medium">{cat.nombre}</SelectItem>
               ))}
            </SelectContent>
          </Select>
        </div>

      <div className="flex-1 overflow-auto bg-white rounded-b-2xl">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-medium whitespace-pre">Cargando catálogo maestro...</div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-b border-slate-200">
                <TableHead className="w-[140px] font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">SKU / ID</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Producto</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Atributos IA</TableHead>
                <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Costo</TableHead>
                <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">P. Venta</TableHead>
                <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">Stock</TableHead>
                <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((prod: Product) => (
                <TableRow key={prod.id} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-100 group">
                  <TableCell className="pl-6 py-2 align-top">
                    <div className="flex flex-col mt-1.5">
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 w-fit px-1.5 py-0.5 rounded mt-0.5 tracking-wider">{prod.sku || "N/A"}</span>
                      <span className="text-[9px] text-slate-400 font-mono italic inline-block mt-0.5">{prod.id.substring(0,8)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="max-w-[200px] xl:max-w-[300px]">
                      <p className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors truncate">{prod.nombre}</p>
                      <p className="text-[10px] text-slate-400 truncate">{(prod as any).categorias?.nombre || "General"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                     <div className="flex gap-2">
                        {prod.es_fraccionado && (
                          <div title="Producto Fraccionado" className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                            <Scale className="w-4 h-4" />
                          </div>
                        )}
                        {(prod.beneficios || prod.sintomas_alivia) && (
                          <div title="Conocimiento IA" className="p-1.5 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">
                            <BrainCircuit className="w-4 h-4" />
                          </div>
                        )}
                        {prod.fecha_vencimiento && (
                          <div title={`Vence el: ${new Date(prod.fecha_vencimiento).toLocaleDateString()}`} className={cn(
                            "p-1.5 rounded-lg border",
                            new Date(prod.fecha_vencimiento) < new Date() 
                              ? "bg-rose-100 text-rose-700 border-rose-200" 
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            <Calendar className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                  </TableCell>
                  <TableCell className="text-right text-slate-400 font-medium">{formatCurrency(prod.precio_compra)}</TableCell>
                  <TableCell className="text-right text-slate-900 font-black">{formatCurrency(prod.precio_venta)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "font-black px-2.5 py-1 rounded-lg text-sm shadow-sm",
                        (prod as any).stock_actual <= prod.stock_minimo 
                          ? "bg-rose-100 text-rose-700 border border-rose-200" 
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      )}>
                        {(prod as any).stock_actual || 0}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 font-bold tracking-tighter uppercase">Min Alert: {prod.stock_minimo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center pr-8">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <Button 
                        onClick={() => {
                          setSelectedProduct(prod);
                          setIsDialogOpen(true);
                        }}
                        variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(prod.id)}
                        variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-32 bg-slate-50/10">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <PackageSearch className="w-16 h-16 text-slate-300" />
                      <p className="text-slate-500 font-bold italic">No se encontraron productos en este catálogo.</p>
                      <Button onClick={() => setIsDialogOpen(true)} variant="link" className="text-emerald-600 font-black uppercase tracking-widest text-xs">Crear mi primer producto</Button>
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

function CardStat({ label, value, icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-50 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 shadow-rose-50 border-rose-100",
    teal: "bg-teal-50 text-teal-600 shadow-teal-50 border-teal-100",
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all border-b-4 border-b-transparent hover:border-b-emerald-500 group relative overflow-hidden">
      <div className="relative z-10">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-1 tracking-tighter">{value}</p>
      </div>
      <div className={cn("p-3 rounded-xl shadow-inner transition-all group-hover:rotate-12 group-hover:scale-110 border", colors[color])}>
        {icon}
      </div>
      <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 blur-2xl", colors[color].split(' ')[0])} />
    </div>
  );
}
