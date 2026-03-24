// components/admin/AdminPoints.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function formatUptime(s: number) {
  return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`
}

function Avatar({ name }: { name: string }) {
  const i = (name||'?')[0].toUpperCase()
  const palette = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const color = palette[i.charCodeAt(0) % palette.length]
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="text-white text-[13px] font-bold">{i}</span>
    </div>
  )
}

function badgeLabel(pts: number) {
  if (pts >= 400) return 'ELITE'
  if (pts >= 250) return 'PRO'
  if (pts >= 100) return 'VERIFIED'
  if (pts >= 50)  return 'SECURED FOUNDER'
  return 'BEGINNER'
}

export default function AdminPoints() {
  const [tab,            setTab]            = useState<'award' | 'subtract'>('award')
  const [username,       setUsername]       = useState('')
  const [points,         setPoints]         = useState('')
  const [reason,         setReason]         = useState('')
  const [loading,        setLoading]        = useState(false)
  const [msg,            setMsg]            = useState('')
  const [pointLogs,      setPointLogs]      = useState<any[]>([])
  const [topProfiles,    setTopProfiles]    = useState<any[]>([])
  const [uptime,         setUptime]         = useState('—')
  const [platformStartMs,setPlatformStartMs]= useState<number|null>(null)

  useEffect(() => {
    if (!platformStartMs) return
    const tick = () => setUptime(formatUptime(Math.floor((Date.now()-platformStartMs)/1000)))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [platformStartMs])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const { data: fu } = await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
    if (fu?.created_at) setPlatformStartMs(new Date(fu.created_at).getTime())

    const { data: logs } = await supabase.from('point_logs').select('*').order('created_at',{ascending:false}).limit(50)
    setPointLogs(logs || [])

    const { data: top } = await supabase.from('users').select('id, username, email, avatar_url, profile_strength')
      .order('profile_strength',{ascending:false}).limit(10)
    // Get admin awards per user
    const { data: awardRows } = await supabase.from('point_logs').select('user_id, amount').eq('action','award')
    const awardMap: Record<string,number> = {}
    ;(awardRows||[]).forEach((r:any) => { awardMap[r.user_id] = (awardMap[r.user_id]||0) + (r.amount||0) })
    setTopProfiles((top||[]).map((u:any) => ({ ...u, admin_awards: awardMap[u.id]||0 })))
  }

  const handleSubmit = async () => {
    if (!username.trim() || !points.trim()) return setMsg('Username and points required.')
    const amt = parseInt(points)
    if (isNaN(amt) || amt <= 0) return setMsg('Enter a valid positive number.')
    setLoading(true); setMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const adminEmail = session?.user?.email || 'admin'

    // Find user
    const { data: user } = await supabase.from('users').select('id, username, profile_strength')
      .eq('username', username.toLowerCase().replace('@','')).single()

    if (!user) { setLoading(false); return setMsg('User not found.') }

    const delta  = tab === 'award' ? amt : -amt
    const newPts = Math.max((user.profile_strength || 0) + delta, 0)

    const { error } = await supabase.from('users').update({ profile_strength: newPts }).eq('id', user.id)
    if (error) { setLoading(false); return setMsg('Failed to update points.') }

    // Log it
    await supabase.from('point_logs').insert({
      admin_email: adminEmail, user_id: user.id,
      username: user.username, amount: tab === 'award' ? amt : -amt,
      action: tab, reason: reason.trim() || null,
    })

    // Write to admin_logs
    await supabase.from('admin_logs').insert({
      admin_email: adminEmail,
      action: tab === 'award' ? `Award +${amt}pts` : `Subtract -${amt}pts`,
      target_type: 'user', target_id: user.id,
      target_label: `@${user.username}`,
      description: reason.trim() || (tab === 'award' ? 'admin award' : 'admin deduction'),
    })

    setMsg(`✓ ${tab === 'award' ? 'Awarded' : 'Subtracted'} ${amt} points ${tab === 'award' ? 'to' : 'from'} @${user.username}`)
    setUsername(''); setPoints(''); setReason('')
    setLoading(false)
    fetchAll()
  }

  const inputCls = 'w-full bg-[#0d1020] border border-white/[0.12] rounded-xl px-4 py-3 text-white/80 text-[14px] outline-none focus:border-blue-500/60 transition-colors placeholder-white/20'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">
            Points <span className="text-blue-400">Control</span>
          </h1>
          <p className="text-white/35 text-sm mt-1 max-w-xl">
            Manually award or adjust points for users. All actions are logged with your admin ID, reason, and timestamp.
            Points awarded by admin appear in the user's Profile Strength tooltip — fully transparent.
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

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="min-w-0">

          {/* Award / Subtract tabs */}
          <div className="flex mb-6 border-b border-white/[0.08]">
            {(['award', 'subtract'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3 text-[14px] font-semibold capitalize relative transition-colors
                  ${tab === t ? 'text-white' : 'text-white/35 hover:text-white/60'}`}>
                {t === 'award' ? 'Award Points' : 'Subtract Points'}
                {tab === t && (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${t === 'subtract' ? 'bg-red-500' : 'bg-blue-500'}`} />
                )}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-white/55 text-[12px] font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                Username <span className="text-blue-400 text-[10px]">ℹ</span>
              </label>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="@username" className={inputCls} />
            </div>
            <div>
              <label className="text-white/55 text-[12px] font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                Points amount <span className="text-blue-400 text-[10px]">ℹ</span>
              </label>
              <input value={points} onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 10pts" className={inputCls} />
            </div>
          </div>

          <div className="mb-5">
            <label className="text-white/55 text-[12px] font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
              Reason <span className="text-blue-400 text-[10px]">ℹ</span>
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
              placeholder="e.g. early adopter bonus, contest winner, etc."
              className={`${inputCls} resize-none`} />
          </div>

          {msg && (
            <p className={`text-[13px] mb-4 ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
          )}

          <button onClick={handleSubmit} disabled={loading || !username || !points}
            className="w-full py-4 rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: tab === 'subtract' ? '#dc2626' : '#0038FF' }}>
            {loading
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing...</>
              : <>{tab === 'award' ? 'Award points to profile' : 'Subtract points from profile'} <span className="text-lg">👤</span></>
            }
          </button>

          {/* Top profiles table */}
          <div className="mt-8">
            <h3 className="text-white font-bold text-[16px] mb-4">Top profiles by strength</h3>
            <div className="bg-[#0d1020] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-4 px-5 py-3 border-b border-white/[0.07]">
                {['User','Point','Badge','Admin Awards'].map((h) => (
                  <span key={h} className="text-white/40 text-[12px] font-semibold">{h}</span>
                ))}
              </div>
              {topProfiles.length === 0
                ? <p className="text-white/20 text-sm px-5 py-6">No users yet.</p>
                : topProfiles.map((u) => (
                  <div key={u.id} className="grid grid-cols-4 items-center px-5 py-3.5 border-b border-white/[0.05] last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.username} />
                      <div>
                        <p className="text-white/80 text-[13px] font-medium">@{u.username}</p>
                        <p className="text-white/30 text-[11px]">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-white/75 text-[14px] font-semibold">{u.profile_strength || 0}</span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 w-fit">
                      {badgeLabel(u.profile_strength || 0)}
                    </span>
                    <span className="text-green-400 text-[14px] font-semibold">
                      {u.admin_awards > 0 ? `+${u.admin_awards}` : '—'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Points log sidebar */}
        <div className="hidden lg:block w-[280px] flex-shrink-0">
          <div className="bg-[#0d1020] rounded-2xl overflow-hidden sticky top-24">
            <div className="px-4 py-3.5 border-b border-white/[0.07]">
              <p className="text-white font-bold text-[15px]">Points log</p>
              <p className="text-white/35 text-[11px]">Admin Log</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-white/[0.05]">
              {pointLogs.length === 0 ? (
                <p className="text-white/20 text-[12px] px-4 py-5">No point actions yet.</p>
              ) : pointLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3.5">
                  <span className={`text-[13px] font-bold flex-shrink-0 w-10 text-right ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {log.amount > 0 ? `+${log.amount}` : log.amount}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white/80 text-[12px] font-medium">@{log.username}</p>
                    <p className="text-white/35 text-[11px] truncate">{log.reason || 'admin action'}</p>
                    <p className="text-white/20 text-[10px]">
                      {new Date(log.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}