"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gzozrzyzzitgpbcsdvwp.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function manageUserAction(payload: any) {
  if (!supabaseServiceKey) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor" };

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    if (payload.id) {
      // Editar
      const updateData: any = {
        nombre: payload.nombre,
        email: payload.email,
        rol: payload.rol,
        sucursal_id: payload.sucursal_id,
        activo: payload.activo
      };

      if (payload.password && payload.auth_user_id) {
        // Actualizar contraseña en Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          payload.auth_user_id,
          { password: payload.password }
        );
        if (authError) throw authError;
      }

      const { error: dbError } = await supabaseAdmin
        .from("usuarios")
        .update(updateData)
        .eq("id", payload.id);
      
      if (dbError) throw dbError;

      return { success: true };

    } else {
      // Crear (con Autenticación forzada)
      if (!payload.password) throw new Error("La contraseña es obligatoria para un nuevo usuario.");

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true, // Automáticamente validado
        user_metadata: {
          full_name: payload.nombre,
        }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabaseAdmin
        .from("usuarios")
        .insert({
          tenant_id: payload.tenant_id,
          auth_user_id: authData.user?.id,
          nombre: payload.nombre,
          email: payload.email,
          rol: payload.rol,
          sucursal_id: payload.sucursal_id,
          activo: payload.activo !== undefined ? payload.activo : true
        });

      if (dbError) throw dbError;

      return { success: true };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteUserAction(payload: { user_db_id: string, auth_user_id?: string }) {
  if (!supabaseServiceKey) return { error: "Service Role Key missing." };
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Delete from public.usuarios
    const { error: dbError } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", payload.user_db_id);
    
    if (dbError) throw dbError;

    // Delete from Auth (if exists)
    if (payload.auth_user_id) {
      // ignore auth error just in case it's orphan
      await supabaseAdmin.auth.admin.deleteUser(payload.auth_user_id);
    }

    return { success: true };
  } catch(err: any) {
    return { error: err.message };
  }
}
