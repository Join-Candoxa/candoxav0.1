// components/admin/AdminAnnouncements.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Section = 'home' | 'discover' | 'both'
type AnnouncementType = 'badge' | 'referral' | 'platform' | 'feature' | 'other'

const TYPE_ICONS: Record<AnnouncementType, string> = {
  badge:    '🏆',
  referral: '🔗',
  platform: '🖼',
  feature:  '✨',
  other:    '📣',
}

function SectionPill({ section }: { section: string }) {
  const s = (section || '').toLowerCase()
  if (s === 'both') return (
    <div className="flex gap-1">
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600/30 border border-blue-500/30 text-blue-300">Home feed</span>
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-600/30 border border-purple-500/30 text-purple-300">Discover</span>
    </div>
  )
  if (s === 'discover') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-600/30 border border-purple-500/30 text-purple-300">Discover</span>
  return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600/30 border border-blue-500/30 text-blue-300">Home feed</span>
}

function formatUptime(s: number) {
  return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`
}

export default function AdminAnnouncements() {
  const [title,          setTitle]          = useState('')
  const [message,        setMessage]        = useState('')
  const [section,        setSection]        = useState<Section>('home')
  const [annType,        setAnnType]        = useState<AnnouncementType | ''>('')
  const [loading,        setLoading]        = useState(false)
  const [msg,            setMsg]            = useState('')
  const [announcements,  setAnnouncements]  = useState<any[]>([])
  const [uptime,         setUptime]         = useState('—')
  const [platformStartMs,setPlatformStartMs]= useState<number|null>(null)

  useEffect(() => {
    if (!platformStartMs) return
    const tick = () => setUptime(formatUptime(Math.floor((Date.now()-platformStartMs)/1000)))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [platformStartMs])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data: fu } = await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
    if (fu?.created_at) setPlatformStartMs(new Date(fu.created_at).getTime())

    const { data } = await supabase.from('announcements').select('*').order('created_at',{ascending:false}).limit(20)
    setAnnouncements(data || [])
  }

  const handlePost = async () => {
    if (!title.trim() || !message.trim()) return setMsg('Title and message required.')
    setLoading(true); setMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const adminEmail = session?.user?.email || 'admin'

    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: message.trim(),
      section,
      type: annType || 'other',
      created_by: adminEmail,
      created_at: new Date().toISOString(),
    })

    if (error) { setLoading(false); return setMsg('Failed to post announcement.') }

    // Log it
    await supabase.from('admin_logs').insert({
      admin_email: adminEmail,
      action: 'Announcement',
      target_type: 'platform',
      target_label: title.trim(),
      description: `Posted to ${section}`,
    })

    setMsg('✓ Announcement posted successfully.')
    setTitle(''); setMessage(''); setAnnType('')
    setLoading(false)
    fetchAll()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const inputCls = 'w-full bg-[#0d1020] border border-white/[0.12] rounded-xl px-4 py-3 text-white/80 text-[14px] outline-none focus:border-blue-500/60 transition-colors placeholder-white/25'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">Announcements</h1>
          <p className="text-white/35 text-sm mt-1">
            Post platform-wide messages to Home or Discover. Announce updates, new badges, or referral milestones.
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

      <div className="grid lg:grid-cols-2 gap-8">

        {/* Left — New announcement form */}
        <div>
          <h2 className="text-white font-bold text-[20px] mb-1">New Announcement</h2>
          <p className="text-white/35 text-[13px] mb-5">Messages appear as a banner at the top of the selected section for all users.</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-white/55 text-[12px] font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                Announcement title <span className="text-blue-400 text-[10px]">ℹ</span>
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New badge Unlocked (Early founder)"
                className={inputCls} />
            </div>

            <div>
              <label className="text-white/55 text-[12px] font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                Message <span className="text-blue-400 text-[10px]">ℹ</span>
              </label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                placeholder="Keep your announcement clear, professional and motivating"
                className={`${inputCls} resize-none`} />
            </div>

            {/* Target Section */}
            <div>
              <p className="text-white font-semibold text-[15px] mb-3">Target Section</p>
              <div className="flex gap-3">
                {([
                  { key: 'home',     label: 'Home feed' },
                  { key: 'discover', label: 'Discover' },
                  { key: 'both',     label: 'Both' },
                ] as const).map((s) => (
                  <button key={s.key} onClick={() => setSection(s.key)}
                    className={`px-5 py-2.5 rounded-xl text-[13px] font-medium border transition-all
                      ${section === s.key
                        ? 'border-blue-500 bg-blue-600/20 text-white'
                        : 'border-white/[0.15] text-white/50 hover:text-white/70'
                      }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Announcement type */}
            <div>
              <p className="text-white font-semibold text-[15px] mb-3">Announcement type</p>
              <div className="relative">
                <select value={annType} onChange={(e) => setAnnType(e.target.value as AnnouncementType)}
                  className={`${inputCls} appearance-none pr-8`}
                  style={{ WebkitAppearance: 'none' }}>
                  <option value="" style={{ background: '#0d1020' }}>Select type</option>
                  <option value="badge"    style={{ background: '#0d1020' }}>Badge Unlock</option>
                  <option value="referral" style={{ background: '#0d1020' }}>Referral Milestone</option>
                  <option value="platform" style={{ background: '#0d1020' }}>Platform Update</option>
                  <option value="feature"  style={{ background: '#0d1020' }}>New Feature</option>
                  <option value="other"    style={{ background: '#0d1020' }}>Other</option>
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {msg && <p className={`text-[13px] ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

            <button onClick={handlePost} disabled={loading || !title || !message}
              className="w-full py-4 rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#0038FF' }}>
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <>Post Announcement <span>✈️</span></>
              }
            </button>
          </div>
        </div>

        {/* Right — Previous announcements */}
        <div>
          <h2 className="text-white font-bold text-[20px] mb-1">Previous Announcement</h2>
          <p className="text-white/35 text-[13px] mb-5">Recently posted platform messages and their reach.</p>

          {announcements.length === 0 ? (
            <p className="text-white/20 text-[13px]">No announcements posted yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {announcements.map((ann) => {
                const icon = TYPE_ICONS[(ann.type || 'other') as AnnouncementType] ?? '📣'
                const posted = new Date(ann.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                return (
                  <div key={ann.id} className="bg-[#0d1020] border border-white/[0.08] rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-[16px]">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-[14px] leading-tight">{ann.title}</p>
                        <p className="text-white/40 text-[12px] mt-1 leading-relaxed line-clamp-2">{ann.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[11px]">Posted {posted} · {ann.created_by || 'SuperAdmin'}</span>
                        <SectionPill section={ann.section || 'home'} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDelete(ann.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                          </svg>
                        </button>
                        <button className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}