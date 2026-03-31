"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/database.types";

type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];
type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

export function useUserProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setLoading(false);
          return;
        }
        setUser(authUser);

        // Check verification (Supabase property)
        const isEmailVerified = authUser.email_confirmed_at || authUser.confirmed_at;

        // Fetch profile from usuarios table
        const { data: profileData } = await supabase
          .from("usuarios")
          .select("*, tenants(*)")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (profileData) {
          const { tenants, ...profileInfo } = profileData;
          // Force superadmin for the master email
          if (authUser.email === 'admin@velora.com') {
            profileInfo.rol = 'superadmin';
          }
          setProfile(profileInfo as any);
          setTenant(tenants as any);
        } else if (authUser.email === 'admin@velora.com') {
          // Fallback even if profile is missing in DB
          setProfile({ email: authUser.email, rol: 'superadmin' } as any);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [supabase]);

  const isVerified = user?.email_confirmed_at || user?.confirmed_at;

  return { user, profile, tenant, loading, isVerified };
}
