import { createClient } from '@supabase/supabase-js'

// Public values (the anon key is safe to ship; access is limited by row level security in the DB).
// Set them as Vercel Environment Variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or put them here.
const URL = import.meta.env.VITE_SUPABASE_URL || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

window.masterSb = URL && KEY
  ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
