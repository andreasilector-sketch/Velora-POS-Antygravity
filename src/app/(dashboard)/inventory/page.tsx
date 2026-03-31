"use client";

import Link from "next/link";
import { Layers, Tag, Warehouse, DollarSign, RefreshCw, BarChart3, Package, ChevronRight } from "lucide-react";

const MODULES = [
  { title: "Ítems de Venta", desc: "Catálogo completo de productos", href: "/products", icon: Package, color: "emerald" },
  { title: "Valor de Inventario", desc: "Resumen del valor de tu stock", href: "/inventory/value", icon: BarChart3, color: "sky" },
  { title: "Ajustes de Inventario", desc: "Entradas, salidas y correcciones", href: "/inventory/adjustments", icon: RefreshCw, color: "amber" },
  { title: "Gestión de Ítems", desc: "Vista avanzada con alertas de stock", href: "/inventory/management", icon: Layers, color: "violet" },
  { title: "Listas de Precios", desc: "Precios diferenciados por cliente", href: "/inventory/prices", icon: DollarSign, color: "rose" },
  { title: "Bodegas", desc: "Sucursales y ubicaciones", href: "/inventory/warehouses", icon: Warehouse, color: "orange" },
  { title: "Categorías", desc: "Organizar tu catálogo", href: "/inventory/categories", icon: Tag, color: "teal" },
];

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
  sky: "bg-sky-50 border-sky-100 text-sky-600",
  amber: "bg-amber-50 border-amber-100 text-amber-600",
  violet: "bg-violet-50 border-violet-100 text-violet-600",
  rose: "bg-rose-50 border-rose-100 text-rose-600",
  orange: "bg-orange-50 border-orange-100 text-orange-600",
  teal: "bg-teal-50 border-teal-100 text-teal-600",
};

export default function InventarioPage() {
  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Inventario</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Gestión completa de tu stock y catálogo de productos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(mod => {
          const Icon = mod.icon;
          const colorClasses = COLOR_MAP[mod.color];
          return (
            <Link key={mod.href} href={mod.href} className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group flex items-start gap-4">
              <div className={`p-3 rounded-xl border ${colorClasses}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800">{mod.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{mod.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 mt-1 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
