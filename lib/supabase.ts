// lib/supabase.ts — Supabase client + auth listener
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auto-create user profile on first sign in
export const ensureUserProfile = async (user: any) => {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!existing) {
    const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
    await supabase.from('users').insert({
      email: user.email,
      username,
      display_name: user.user_metadata?.full_name || username,
      avatar_url: user.user_metadata?.avatar_url || null,
      role: 'user',
      status: 'active',
    })
  }
}