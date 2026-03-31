import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gzozrzyzzitgpbcsdvwp.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b3pyenl6eml0Z3BiY3NkdndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxODAsImV4cCI6MjA4ODU5MjE4MH0.g36iagNIIm0C46RVTu7fI3hOTDL3uc4Pp_q2WTErlIE",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
