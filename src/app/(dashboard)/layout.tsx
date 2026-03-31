"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ROLES, ROLE_PERMISSIONS } from "@/lib/roles";
import { 
  ShoppingBag, 
  LayoutDashboard, 
  Package, 
  Users, 
  Store, 
  FileText,
  Settings,
  LogOut,
  Gift,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calculator,
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, tenant, user, loading, isVerified } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  // CRITICAL: mounted flag to prevent SSR/CSR hydration mismatch
  // The sidebar menu differs between server (default CAJERO role) and client (real role)
  // Without this flag, React throws insertBefore NotFoundError in production
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", group: "Principal", permission: "dashboard" },
    { name: "Punto de Venta", icon: ShoppingBag, href: "/pos", group: "Principal", permission: "pos" },
    { name: "Caja y Turnos", icon: LogOut, href: "/caja", group: "Gestión", permission: "caja" },
    { name: "Promociones", icon: Gift, href: "/promotions", group: "Gestión", permission: "promotions" },
    { 
      name: "Inventario", 
      icon: Package, 
      group: "Gestión", 
      permission: "inventory",
      basePath: "/inventory",
      subItems: [
        { name: "Ítems de venta", href: "/products" },
        { name: "Valor de inventario", href: "/inventory/value" },
        { name: "Ajustes de inventario", href: "/inventory/adjustments" },
        { name: "Gestión de ítems", href: "/inventory/management" },
        { name: "Listas de precios", href: "/inventory/prices" },
        { name: "Bodegas", href: "/inventory/warehouses" },
        { name: "Entradas de Mercancía", href: "/inventory/purchases" },
        { name: "Categorías", href: "/inventory/categories" },
        { name: "Atributos", href: "/inventory/attributes" },
      ]
    },
    { name: "Clientes", icon: Users, href: "/customers", group: "Gestión", permission: "customers" },
    { 
      name: "Finanzas", 
      icon: Wallet, 
      group: "Gestión", 
      permission: "finances",
      subItems: [
        { name: "Gastos Operativos", href: "/finances/expenses" },
        { name: "Cuentas por Pagar", href: "/finances/payable" },
        { name: "Flujo de Efectivo", href: "/finances/cashflow" },
      ]
    },
    { 
      name: "Reportes", 
      icon: FileText, 
      group: "Gestión", 
      permission: "reports",
      subItems: [
        { name: "Historial de Ventas", href: "/reports/sales" },
        { name: "Ventas por Ítem", href: "/reports/items" },
        { name: "Reporte de Inventario", href: "/reports/inventory" },
        { name: "Cierre de Caja", href: "/reports/caja" },
      ]
    },
  ];

  const [openMenus, setOpenMenus] = useState<string[]>(["Inventario"]); // Auto-open Inventario by default

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const userRole = profile?.rol || ROLES.CAJERO;
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
  
  const filteredMenuItems = menuItems.filter(item => 
    userRole === ROLES.SUPERADMIN || permissions.includes(item.permission) || permissions.includes('all')
  );

  // Loading Check will now be done inline in the children area to preserve the shell


  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-52 xl:w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="h-14 flex items-center px-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base text-slate-800 tracking-tight">
            <div className="bg-emerald-600 text-white p-1.5 rounded-lg shadow-sm">
              <Store className="w-4 h-4" />
            </div>
            Velora <span className="text-emerald-600">POS</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5 custom-scrollbar">
          {!mounted ? (
            // SSR skeleton — static, consistent with server render
            <div className="flex flex-col gap-2 animate-pulse">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : (<>
          {userRole === ROLES.SUPERADMIN && (
            <>
              <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2 px-3 mt-4">
                Administración Global
              </div>
              <Link 
                href="/superadmin" 
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200",
                  pathname.startsWith("/superadmin")
                    ? "bg-rose-50 text-rose-700 shadow-sm border-rose-100 border" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <ShieldCheck className="w-5 h-5" />
                Panel Superadmin
              </Link>
            </>
          )}

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 mt-4">
            Principal
          </div>
          {filteredMenuItems.filter(i => i.group === "Principal").map((item) => (
            <Link 
              key={item.href || item.name}
              href={item.href || "#"} 
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                item.href && pathname === item.href 
                  ? "bg-emerald-50 text-emerald-700 shadow-sm border-emerald-100 border" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", item.href && pathname === item.href ? "text-emerald-600" : "text-slate-400")} />
              {item.name}
            </Link>
          ))}

          {filteredMenuItems.filter(i => i.group === "Gestión").length > 0 && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 mt-6">
                Gestión
              </div>
              {filteredMenuItems.filter(i => i.group === "Gestión").map((item) => {
                const isOpen = openMenus.includes(item.name);
                const isActiveGroup = item.subItems?.some(s => pathname === s.href) || pathname === item.href;

                if (item.subItems) {
                  return (
                    <div key={item.name} className="flex flex-col gap-0.5">
                      <button 
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                          isActiveGroup 
                            ? "bg-emerald-50/50 text-emerald-800" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <item.icon className={cn("w-4 h-4 flex-shrink-0", isActiveGroup ? "text-emerald-600" : "text-slate-400")} />
                          {item.name}
                        </span>
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      
                      {isOpen && (
                        <div className="flex flex-col gap-0.5 ml-7 pl-3 border-l-2 border-slate-100 mt-0.5">
                          {item.subItems.map(subItem => (
                            <Link 
                              key={subItem.name}
                              href={subItem.href}
                              className={cn(
                                "py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all duration-200",
                                pathname === subItem.href 
                                  ? "text-emerald-700 bg-emerald-50/80 font-bold"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                              )}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link 
                    key={item.href || item.name}
                    href={item.href || "#"} 
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      pathname === item.href 
                        ? "bg-emerald-50 text-emerald-700 shadow-sm border-emerald-100 border" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", pathname === item.href ? "text-emerald-600" : "text-slate-400")} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}

          <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-0.5">
            {(userRole === ROLES.ADMIN || userRole === ROLES.SUPERADMIN) && (
              <Link 
                href="/settings" 
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === "/settings" 
                    ? "bg-emerald-50 text-emerald-700 shadow-sm border-emerald-100 border" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Settings className={cn("w-4 h-4 flex-shrink-0", pathname === "/settings" ? "text-emerald-600" : "text-slate-400")} />
                Configuración
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center w-full gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 font-medium transition-all duration-200 text-left"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Cerrar Sesión
            </button>
          </div>
          </>)}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10 shadow-sm font-sans">
          <div className="flex items-center gap-3 min-w-0">
             <h1 className="text-sm font-black text-slate-800 flex items-center gap-2 truncate">
               <span className={cn("w-2 h-2 rounded-full flex-shrink-0", isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} title={isVerified ? "Verificado" : "Pendiente de Verificación"} />
               {tenant?.nombre_empresa || "Velora POS"}
             </h1>
             {!isVerified && (
               <div className="hidden sm:flex bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full items-center gap-1.5">
                 <AlertTriangle className="w-3 h-3 text-amber-600" />
                 <span className="text-[10px] font-black text-amber-700 uppercase">Verifica correo</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-slate-800 truncate max-w-[160px]">{user?.email}</span>
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.15em]">{userRole}</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 shadow-inner flex items-center justify-center text-emerald-700 font-black uppercase text-sm">
              {user?.email?.substring(0, 2)}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-5 bg-slate-50/50">
          {loading ? (
             <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                   <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                   <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest animate-pulse">Cargando...</p>
                </div>
             </div>
          ) : (
             children
          )}
        </div>
      </main>
    </div>
  );
}
