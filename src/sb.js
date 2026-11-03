import { createClient } from '@supabase/supabase-js'

// Public values (the publishable/anon key is safe to ship; access is limited by row level security in the DB).
// Set them as Vercel Environment Variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
const RAW_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Accept a pasted "https://xxxx.supabase.co/rest/v1/" and keep only the origin.
let URL_ = ''
try { URL_ = RAW_URL ? new URL(/^https?:\/\//i.test(RAW_URL) ? RAW_URL : 'https://' + RAW_URL).origin : '' } catch { URL_ = '' }

let client = null
if (KEY.startsWith('sb_secret_')) {
  console.error('VITE_SUPABASE_ANON_KEY holds a SECRET key. Use the publishable key (sb_publishable_...). Sync is disabled.')
} else if (URL_ && KEY) {
  client = createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true } })
}
window.masterSb = client
