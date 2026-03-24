// app/admin/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminSettings from '@/components/admin/AdminSettings'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/admin'); return }
      const { data: admin } = await supabase.from('admin_users').select('*').eq('email', session.user.email).single()
      if (!admin) { router.push('/admin'); return }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>

  return <AdminLayout activePage="settings"><AdminSettings /></AdminLayout>
}