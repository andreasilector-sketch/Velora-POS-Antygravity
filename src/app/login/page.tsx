"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, LogIn, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
        setError("Tu cuenta aún no está verificada. Por favor revisa tu correo electrónico.");
        // We still allow login as it's just a warning in many POS setups, 
        // but the layout will show the banner.
        // Actually, let's just proceed, the layout handles the "Unverified" banner.
      }

      router.push("/dashboard");
      router.refresh();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message === "Invalid login credentials" ? "Credenciales inválidas." : "Error al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

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
            Velora POS
          </h1>
          <p className="text-slate-500 mt-2">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@velora.com"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black shadow-lg shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-95 rounded-xl"
            >
              {isLoading ? (
                "Verificando..."
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-slate-400 text-center relative z-10">
        &copy; {new Date().getFullYear()} Velora POS. Sistema de Gestión y Ventas.
      </p>
    </div>
  );
}
