"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, UserPlus, Lock, Mail, Building, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: businessName, // Temporary storing business name in metadata
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario.");

      // 2. Create the Tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          nombre_empresa: businessName,
          email: email,
          plan: "basico",
          estado: "activo"
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Create Default Sucursal (Sede)
      const { data: sucursalData, error: sucursalError } = await supabase
        .from("sucursales")
        .insert({
          tenant_id: tenantData.id,
          nombre: "Sede Principal",
          estado: "activo"
        })
        .select()
        .single();

      if (sucursalError) throw sucursalError;

      // 4. Create Default Caja
      const { error: cajaError } = await supabase
        .from("cajas")
        .insert({
          sucursal_id: sucursalData.id,
          nombre: "Caja 1",
          activa: true
        });

      if (cajaError) throw cajaError;

      // 5. Create User Profile
      const { error: profileError } = await supabase
        .from("usuarios")
        .insert({
          tenant_id: tenantData.id,
          sucursal_id: sucursalData.id,
          auth_user_id: authData.user.id,
          nombre: businessName + " Admin",
          email: email,
          rol: "admin",
          activo: true
        });

      if (profileError) throw profileError;

      setIsSuccess(true);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al registrar el negocio. Por favor intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-10 text-center relative z-10">
          <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">¡Registro Exitoso!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Hemos creado el entorno para <span className="font-bold text-emerald-600">{businessName}</span>. 
            Por favor, revisa tu correo electrónico para verificar tu cuenta e iniciar sesión.
          </p>
          <Link href="/login" className="w-full">
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 font-bold">
              Ir al Inicio de Sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
        <div className="px-8 pt-10 pb-8 text-center bg-slate-50/50 border-b border-slate-100">
          <div className="mx-auto w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            Comienza con Velora
          </h1>
          <p className="text-slate-500 mt-2">
            Registra tu negocio y automatiza tus ventas
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Nombre del Negocio</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="businessName"
                  placeholder="Ej. Mi Tienda Naturista"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 rounded-xl"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Email de Administrador</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@minegocio.com"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black shadow-lg shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-95 rounded-xl"
            >
              {isLoading ? (
                "Creando Entorno..."
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Registrar mi Negocio
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 font-medium">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-emerald-600 font-black hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-slate-400 text-center relative z-10">
        &copy; {new Date().getFullYear()} Velora POS. Powering local businesses.
      </p>
    </div>
  );
}
