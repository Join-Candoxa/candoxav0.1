// app/admin/entries/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminEntries, { EntryFilterType } from '@/components/admin/AdminEntries'

const FILTERS: { key: EntryFilterType; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'most',    label: 'Most Entries' },
  { key: 'least',   label: 'Least Entries' },
]

export default function AdminEntriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<EntryFilterType>('all')

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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  const topbarRight = (
    <div className="flex items-center">
      {FILTERS.map((f, i) => (
        <button key={f.key} onClick={() => setFilter(f.key)}
          className={`px-4 py-[7px] text-[12px] font-medium border border-white/[0.12] transition-all
            ${i === 0 ? 'rounded-l-lg' : ''} ${i === FILTERS.length-1 ? 'rounded-r-lg' : ''} ${i > 0 ? '-ml-px' : ''}
            ${filter === f.key ? 'bg-blue-600/20 border-blue-500 text-blue-300 relative z-10' : 'bg-transparent text-white/45 hover:text-white/70 hover:bg-white/[0.04]'}`}>
          {f.label}
        </button>
      ))}
    </div>
  )

  return (
    <AdminLayout activePage="entries" topbarRight={topbarRight}>
      <AdminEntries activeFilter={filter} />
    </AdminLayout>
  )
}