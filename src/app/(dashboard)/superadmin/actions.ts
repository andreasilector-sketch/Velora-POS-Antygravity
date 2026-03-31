"use server";

import { createClient } from '@supabase/supabase-js';

// We must create a fresh admin client using the Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gzozrzyzzitgpbcsdvwp.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function provisionTenantAction(formData: any) {
  if (!supabaseServiceKey) {
    return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el archivo .env.local" };
  }

  // Bypass RLS using the Service Role Key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Create Auth User without signing the Superadmin out
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password || "Velora2024*",
      email_confirm: true,
      user_metadata: {
        full_name: formData.nombre_empresa,
      }
    });

    if (authError) throw authError;

    // 2. Create the Tenant
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        nombre_empresa: formData.nombre_empresa,
        email: formData.email,
        nit: formData.nit,
        telefono: formData.telefono,
        plan: formData.plan,
        estado: "activo"
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // 3. Create Default Sucursal
    const { data: sucursalData, error: sucursalError } = await supabaseAdmin
      .from("sucursales")
      .insert({
        tenant_id: tenantData.id,
        nombre: formData.nombre_sucursal,
        estado: "activo"
      })
      .select()
      .single();

    if (sucursalError) throw sucursalError;

    // 4. Create User Profile for the new tenant's owner
    const { error: profileError } = await supabaseAdmin
      .from("usuarios")
      .insert({
        tenant_id: tenantData.id,
        sucursal_id: sucursalData.id,
        auth_user_id: authData.user?.id,
        nombre: formData.nombre_empresa + " Admin",
        email: formData.email,
        rol: "admin",
        activo: true
      });

    if (profileError) throw profileError;

    // 5. Create Default Caja
    const { error: cajaError } = await supabaseAdmin
      .from("cajas")
      .insert({
        sucursal_id: sucursalData.id,
        nombre: "Caja Principal",
        activa: true
      });
      
    if (cajaError) throw cajaError;

    return { success: true };
  } catch (error: any) {
    console.error("Provisioning Action error:", error);
    return { error: error.message || "Error desconocido al provisionar la cuenta." };
  }
}
