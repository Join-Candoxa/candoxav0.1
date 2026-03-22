// components/admin/AdminLogs.tsx — Admin action logs
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('admin_logs')
        .select('*, admin_users(email)')
        .order('created_at', { ascending: false })
        .limit(50)
      setLogs(data || [])
    }
    fetch()
  }, [])

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <div>
      <h1 className="text-white text-2xl font-bold mb-1">Admin <span className="text-blue-400">Logs</span></h1>
      <p className="text-white/40 text-sm mb-6">All admin actions are logged and auditable.</p>

      <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/5">
          {['Admin', 'Action', 'Target', 'Note', 'Time'].map((h) => (
            <span key={h} className="text-white/30 text-xs uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {logs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-white/30 text-sm">No admin actions logged yet.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-white/5 last:border-0">
              <span className="text-white/60 text-xs">{log.admin_users?.email}</span>
              <span className="text-blue-400 text-xs">{log.action}</span>
              <span className="text-white/40 text-xs font-mono">{log.target_type}</span>
              <span className="text-white/30 text-xs truncate">{log.note || '—'}</span>
              <span className="text-white/30 text-xs">{timeAgo(log.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}