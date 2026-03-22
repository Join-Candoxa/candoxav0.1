// app/admin/flagged/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminFlaggedPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [flagged, setFlagged] = useState<any[]>([])

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      const { data: admin } = await supabase.from('admin_users').select('*').eq('email', session.user.email).single()
      if (!admin) { router.push('/admin'); return }
      const { data } = await supabase
        .from('entries')
        .select('*, users(username, email)')
        .eq('status', 'flagged')
        .order('secured_at', { ascending: false })
      setFlagged(data || [])
      setLoading(false)
    }
    check()
  }, [])

  const clearFlag = async (id: string) => {
    await supabase.from('entries').update({ status: 'secured' }).eq('id', id)
    setFlagged(flagged.filter((e) => e.id !== id))
  }

  const removeEntry = async (id: string) => {
    await supabase.from('entries').update({ status: 'deleted' }).eq('id', id)
    setFlagged(flagged.filter((e) => e.id !== id))
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>

  return (
    <AdminLayout activePage="flagged">
      <div>
        <h1 className="text-white text-2xl font-bold mb-1">Flagged <span className="text-blue-400">Content</span></h1>
        <p className="text-white/40 text-sm mb-6">Review and moderate flagged entries.</p>

        {flagged.length === 0 ? (
          <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-12 text-center">
            <p className="text-white/30 text-sm">No flagged entries. All clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flagged.map((entry) => (
              <div key={entry.id} className="bg-[#0A0A0F] border border-yellow-500/20 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 text-sm">⚑</div>
                  <div>
                    <p className="text-white font-medium text-sm">{entry.title}</p>
                    <p className="text-white/40 text-xs">@{entry.users?.username} · {entry.platform}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => clearFlag(entry.id)} className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs px-4 py-2 rounded-xl hover:bg-green-500/30 transition-colors">Clear Flag</button>
                  <button onClick={() => removeEntry(entry.id)} className="bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-4 py-2 rounded-xl hover:bg-red-500/30 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}