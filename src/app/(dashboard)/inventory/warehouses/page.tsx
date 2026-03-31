"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Warehouse, MapPin, Phone, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Sucursal = { id: string; nombre: string; direccion: string | null; telefono: string | null; ciudad: string | null; estado: string | null; };

export default function BodegasPage() {
  const { tenant } = useUserProfile();
  const supabase = createClient();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (tenant) fetchData(); }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("sucursales").select("*").eq("tenant_id", tenant!.id).order("nombre");
    if (data) setSucursales(data);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Bodegas / Sucursales</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">Ubicaciones donde se gestiona tu inventario</p>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-sm text-sky-800 font-medium flex items-start gap-3">
        <Warehouse className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
        <p>Las bodegas se administran desde <strong>Configuración → Sucursales</strong>. Aquí puedes ver el inventario distributed por cada una.</p>
      </div>

      {loading ? (
        <div className="text-slate-400 font-black text-xs uppercase animate-pulse p-8 text-center">Cargando bodegas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sucursales.map((s, idx) => (
            <div key={s.id} className={cn("bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group",
              s.estado === "activo" ? "border-emerald-100" : "border-slate-200 opacity-60"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-emerald-100 rounded-xl">
                  <Warehouse className="w-5 h-5 text-emerald-600" />
                </div>
                <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-full", s.estado === "activo" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                  {s.estado === "activo" ? "✓ Activa" : "Inactiva"}
                </span>
              </div>
              <p className="font-black text-slate-800 text-base">{s.nombre}</p>
              {s.ciudad && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5" /> {s.ciudad}
                </div>
              )}
              {s.direccion && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{s.direccion}</p>}
              {s.telefono && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                  <Phone className="w-3.5 h-3.5" /> {s.telefono}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
