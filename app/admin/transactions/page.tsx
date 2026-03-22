// app/admin/transactions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminTransactions from '@/components/admin/AdminTransactions'

export default function AdminTransactionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      const { data: admin } = await supabase.from('admin_users').select('*').eq('email', session.user.email).single()
      if (!admin) { router.push('/admin'); return }
      setLoading(false)
    }
    check()
  }, [])

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>

  return <AdminLayout activePage="transactions"><AdminTransactions /></AdminLayout>
}