import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gzozrzyzzitgpbcsdvwp.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b3pyenl6eml0Z3BiY3NkdndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTYxODAsImV4cCI6MjA4ODU5MjE4MH0.g36iagNIIm0C46RVTu7fI3hOTDL3uc4Pp_q2WTErlIE"
  )
}
