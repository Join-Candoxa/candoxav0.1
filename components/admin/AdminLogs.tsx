// components/admin/AdminLogs.tsx — Admin Audit Log matching Figma
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 20

function formatUptime(s: number) {
  return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`
}

function ActionBadge({ action }: { action: string }) {
  const a = (action || '').toLowerCase()
  let bg = 'bg-white/10', text = 'text-white/50', dot = 'bg-white/30'

  if (a.includes('flag'))        { bg = 'bg-orange-500/20'; text = 'text-orange-300'; dot = 'bg-orange-400' }
  else if (a.includes('ban') || a.includes('permanent')) { bg = 'bg-red-500/20'; text = 'text-red-300'; dot = 'bg-red-400' }
  else if (a.includes('login'))  { bg = 'bg-blue-500/20'; text = 'text-blue-300'; dot = 'bg-blue-400' }
  else if (a.includes('award') || a.includes('+')) { bg = 'bg-green-500/20'; text = 'text-green-300'; dot = 'bg-green-400' }
  else if (a.includes('delete') || a.includes('remov')) { bg = 'bg-red-500/20'; text = 'text-red-300'; dot = 'bg-red-400' }
  else if (a.includes('payment') || a.includes('process')) { bg = 'bg-blue-400/20'; text = 'text-blue-200'; dot = 'bg-blue-300' }
  else if (a.includes('announce')) { bg = 'bg-yellow-500/20'; text = 'text-yellow-300'; dot = 'bg-yellow-400' }
  else if (a.includes('setting') || a.includes('chang')) { bg = 'bg-purple-500/20'; text = 'text-purple-300'; dot = 'bg-purple-400' }
  else if (a.includes('clear'))  { bg = 'bg-green-500/20'; text = 'text-green-300'; dot = 'bg-green-400' }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {action}
    </span>
  )
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  const pages: (number | '...')[] = []
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i) }
  else {
    pages.push(1, 2, 3)
    if (current > 4) pages.push('...')
    if (current > 3 && current < total - 2) pages.push(current)
    if (current < total - 3) pages.push('...')
    pages.push(total - 1, total)
  }
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {pages.map((p, i) =>
        p === '...' ? <span key={`d${i}`} className="text-white/25 text-[13px] px-1">…</span> : (
          <button key={p} onClick={() => onChange(p as number)}
            className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p === current ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}>
            {p}
          </button>
        )
      )}
    </div>
  )
}

export default function AdminLogs() {
  const [logs,           setLogs]           = useState<any[]>([])
  const [total,          setTotal]          = useState(0)
  const [page,           setPage]           = useState(1)
  const [uptime,         setUptime]         = useState('—')
  const [platformStartMs,setPlatformStartMs]= useState<number|null>(null)
  const [stats, setStats] = useState({ total: 0, today: 0, flags: 0, removals: 0, pointsAwarded: 0, settingsChanged: 0 })

  useEffect(() => {
    if (!platformStartMs) return
    const tick = () => setUptime(formatUptime(Math.floor((Date.now()-platformStartMs)/1000)))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [platformStartMs])

  useEffect(() => { fetchLogs() }, [page])

  const fetchLogs = async () => {
    const { data: fu } = await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
    if (fu?.created_at) setPlatformStartMs(new Date(fu.created_at).getTime())

    const todayMid = new Date(); todayMid.setHours(0,0,0,0)

    const [
      { count: totalCount },
      { count: todayCount },
    ] = await Promise.all([
      supabase.from('admin_logs').select('*',{count:'exact',head:true}),
      supabase.from('admin_logs').select('*',{count:'exact',head:true}).gte('created_at', todayMid.toISOString()),
    ])

    // Get all logs for stats
    const { data: allLogs } = await supabase.from('admin_logs').select('action, description').limit(2000)
    const flags    = (allLogs||[]).filter(l => (l.action||'').toLowerCase().includes('flag')).length
    const removals = (allLogs||[]).filter(l => (l.action||'').toLowerCase().includes('remov') || (l.action||'').toLowerCase().includes('delet')).length
    const awardedPts = (allLogs||[]).filter(l => (l.action||'').toLowerCase().includes('award'))
      .reduce((s, l) => {
        const m = (l.action||'').match(/\+(\d+)pts/)
        return s + (m ? parseInt(m[1]) : 0)
      }, 0)
    const settingsChg = (allLogs||[]).filter(l => (l.action||'').toLowerCase().includes('setting')).length

    setStats({
      total:          totalCount || 0,
      today:          todayCount || 0,
      flags,
      removals,
      pointsAwarded:  awardedPts,
      settingsChanged: settingsChg,
    })

    const { data, count } = await supabase.from('admin_logs').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1)
    setLogs(data || [])
    setTotal(count || 0)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">Admin Audit Log</h1>
          <p className="text-white/35 text-sm mt-1 max-w-xl">
            Every admin action on the platform — immutable, timestamped, and permanently recorded. Filter by type, admin, or target to find specific events.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Total Uptime: <span className="text-white/55 font-mono">{uptime}</span></p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total actions', value: stats.total, color: 'text-blue-400', sub: 'All time' },
          { label: 'Today',  value: stats.today, color: 'text-blue-300', sub: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) },
          { label: 'Flags logged',  value: stats.flags, color: 'text-orange-400', sub: 'All time' },
          { label: 'Removals',      value: stats.removals, color: 'text-red-400', sub: 'All time' },
          { label: 'Points Awarded',value: stats.pointsAwarded > 0 ? `+${stats.pointsAwarded}` : '0', color: 'text-green-400', sub: 'All time' },
          { label: 'Settings changed', value: stats.settingsChanged, color: 'text-red-400', sub: 'All time' },
        ].map((s) => (
          <div key={s.label} className="bg-[#0d1020] border border-white/[0.07] rounded-2xl px-4 py-4">
            <p className="text-white/40 text-[11px] mb-1">{s.label}</p>
            <p className={`text-[28px] font-bold leading-tight ${s.color}`}>{s.value}</p>
            <p className="text-white/25 text-[10px] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0d1020] border border-white/[0.07] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid bg-[#0d1529] px-5 py-3.5"
          style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1.2fr 1.5fr' }}>
          {['Action Type', 'Admin', 'Date', 'Stamp / I.D', 'Description'].map((h) => (
            <span key={h} className="text-white font-bold text-[14px]">{h}</span>
          ))}
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-white/20 text-sm">No admin actions logged yet.</p>
            <p className="text-white/12 text-xs mt-1">Actions will appear here as admins use the platform.</p>
          </div>
        ) : logs.map((log, idx) => (
          <div key={log.id || idx}
            className={`px-5 py-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors
              md:grid md:items-start flex flex-col gap-2`}
            style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1.2fr 1.5fr' }}>

            {/* Action type + target */}
            <div>
              <ActionBadge action={log.action || 'Action'} />
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-white/45 text-[11px]">@{log.target_label?.replace('@','') || '—'}</span>
                {log.target_label && log.action && <span className="text-white/20 text-[10px]">· {log.target_type || ''}</span>}
              </div>
            </div>

            {/* Admin */}
            <div>
              <span className="text-white/65 text-[13px] font-medium">
                {log.admin_email?.includes('super') || log.admin_email?.includes('admin') ? 'Super Admin' : 'Admin'}
              </span>
            </div>

            {/* Date */}
            <div>
              <span className="text-white/45 text-[12px]">
                {new Date(log.created_at).toLocaleDateString('en-US',{year:'numeric',month:'2-digit',day:'2-digit'})}
                {' · '}
                {new Date(log.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} UTC
              </span>
            </div>

            {/* Stamp */}
            <div>
              <p className="text-white/40 text-[11px] font-mono">#log-{String(idx+1+(page-1)*PAGE_SIZE).padStart(4,'0')}</p>
              <p className="text-white/25 text-[10px] mt-0.5">{log.ip || '197.x.x.x'}</p>
            </div>

            {/* Description */}
            <div>
              <span className="text-white/40 text-[12px] leading-relaxed line-clamp-2">
                {log.description || '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
    </div>
  )
}