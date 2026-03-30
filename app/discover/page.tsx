// app/discover/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

type FilterType = 'all' | 'platform' | 'content' | 'recent'
type TabType    = 'creators' | 'entries'

function shortDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function platformIcon(platform: string) {
  const p = (platform || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
  const map: Record<string, string> = {
    youtube:   '/icons/youtube.png',
    instagram: '/icons/instagram.png',
    twitter:   '/icons/x.png',
    x:         '/icons/x.png',
    linkedin:  '/icons/linkedin.png',
    github:    '/icons/others.png',
    tiktok:    '/icons/others.png',
    medium:    '/icons/others.png',
    substack:  '/icons/others.png',
  }
  return map[p] ?? '/icons/others.png'
}

function Avatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'xs'|'sm'|'md'|'lg'|'xl' }) {
  const i = (name || '?')[0].toUpperCase()
  const palette = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color = palette[i.charCodeAt(0) % palette.length]
  const sz = { xs:'w-7 h-7 text-[11px]', sm:'w-8 h-8 text-[12px]', md:'w-10 h-10 text-[14px]', lg:'w-14 h-14 text-[18px]', xl:'w-20 h-20 text-[24px]' }[size]
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${color}`}><span className="text-white font-bold">{i}</span></div>
}

function TrackButton({ userId, myId, trackingMap, onToggle, variant = 'pill' }: {
  userId: string; myId: string; trackingMap: Record<string, boolean>
  onToggle: (id: string) => void; variant?: 'pill'|'blue'
}) {
  if (userId === myId) return null
  const isTracking = !!trackingMap[userId]

  if (variant === 'blue') return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(userId) }}
      className="w-full py-2.5 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5"
      style={isTracking
        ? { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.65)' }
        : { background:'#0038FF', border:'1px solid #0038FF', color:'#fff' }}>
      {isTracking ? <><span className="text-green-400 text-[11px]">✓</span> Tracking</> : 'Track'}
    </button>
  )

  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(userId) }}
      className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1 flex-shrink-0"
      style={isTracking
        ? { background:'rgba(0,56,255,0.10)', borderColor:'rgba(0,56,255,0.30)', color:'#6B8AFF' }
        : { background:'transparent', borderColor:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.55)' }}>
      {isTracking ? <><span className="text-green-400 text-[10px]">✓</span> Tracking</> : 'Track'}
    </button>
  )
}

export default function DiscoverPage() {
  const router = useRouter()
  const [user,          setUser]          = useState<any>(null)
  const [profile,       setProfile]       = useState<any>(null)
  const [filter,        setFilter]        = useState<FilterType>('all')
  const [tab,           setTab]           = useState<TabType>('creators')
  const [search,        setSearch]        = useState('')
  const [stats,         setStats]         = useState({ entries: 0, creators: 0, today: 0 })
  const [builders,      setBuilders]      = useState<any[]>([])
  const [allEntries,    setAllEntries]    = useState<any[]>([])
  const [leaderboard,   setLeaderboard]   = useState<any[]>([])
  const [platformStats, setPlatformStats] = useState<{ platform: string; count: number; icon: string }[]>([])
  const [announcement,  setAnnouncement]  = useState<any>(null)
  const [trackingMap,   setTrackingMap]   = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      supabase.from('users').select('*').eq('email', session.user.email).single()
        .then(({ data }) => { setProfile(data); if (data) fetchAll(data) })
    })
  }, [])

  const fetchAll = async (prof: any) => {
    const todayMid = new Date(); todayMid.setHours(0,0,0,0)

    const [{ count: eCount }, { count: cCount }, { count: tCount }] = await Promise.all([
      supabase.from('entries').select('*', { count:'exact', head:true }),
      supabase.from('users').select('*', { count:'exact', head:true }).eq('role', 'user'),
      supabase.from('entries').select('*', { count:'exact', head:true }).gte('secured_at', todayMid.toISOString()),
    ])
    setStats({ entries: eCount||0, creators: cCount||0, today: tCount||0 })

    const { data: tRows } = await supabase.from('trackers').select('tracked_id').eq('tracker_id', prof.id)
    const tmap: Record<string, boolean> = {}
    ;(tRows||[]).forEach((r: any) => { tmap[r.tracked_id] = true })
    setTrackingMap(tmap)

    // Builders — regular users only, exclude self
    const { data: bData } = await supabase.from('users')
      .select('id, username, avatar_url, bio, profile_strength')
      .neq('id', prof.id)
      .eq('role', 'user')
      .order('profile_strength', { ascending: false }).limit(8)
    const bIds = (bData||[]).map((u: any) => u.id)
    const [{ data: bEntries }, { data: bTracks }] = await Promise.all([
      supabase.from('entries').select('user_id').in('user_id', bIds),
      supabase.from('trackers').select('tracked_id').in('tracked_id', bIds),
    ])
    const eCounts: Record<string,number> = {}; const tcCounts: Record<string,number> = {}
    ;(bEntries||[]).forEach((e:any) => { eCounts[e.user_id]     = (eCounts[e.user_id]||0)+1     })
    ;(bTracks||[]).forEach((t:any)  => { tcCounts[t.tracked_id] = (tcCounts[t.tracked_id]||0)+1 })
    setBuilders((bData||[]).map((u:any) => ({ ...u, entry_count: eCounts[u.id]||0, tracked_count: tcCounts[u.id]||0 })))

    // All secured entries
    const { data: entries } = await supabase.from('entries')
      .select('id, title, description, platform, screenshot_url, secured_at, url, user_id, points, users(id, username, avatar_url, role)')
      .eq('status', 'secured')
      .order('secured_at', { ascending: false }).limit(50)
    // Filter out entries belonging to admin accounts
    setAllEntries((entries||[]).filter((e: any) => e.users?.role !== 'admin'))

    // Leaderboard — regular users only
    const { data: lb } = await supabase.from('users')
      .select('id, username, avatar_url, profile_strength')
      .neq('id', prof.id)
      .eq('role', 'user')
      .order('profile_strength', { ascending: false }).limit(4)
    setLeaderboard(lb||[])

    // Platform stats
    const { data: ap } = await supabase.from('entries').select('platform')
    const pmap: Record<string,number> = {}
    ;(ap||[]).forEach((e:any) => {
      const k = (e.platform||'other').toLowerCase().replace(/\s*\(.*?\)\s*/g,'').trim()
      pmap[k] = (pmap[k]||0)+1
    })
    const iconMap: Record<string,string>  = { youtube:'/icons/youtube.png', instagram:'/icons/instagram.png', twitter:'/icons/x.png', x:'/icons/x.png', linkedin:'/icons/linkedin.png' }
    const labelMap: Record<string,string> = { twitter:'Twitter', x:'Twitter', youtube:'YouTube', instagram:'Instagram', linkedin:'LinkedIn', github:'GitHub' }
    setPlatformStats(
      Object.entries(pmap).sort((a,b)=>b[1]-a[1]).slice(0,4)
        .map(([k,v])=>({ platform:labelMap[k]||k, count:v, icon:iconMap[k]??'/icons/others.png' }))
    )

    const { data: ann } = await supabase.from('announcements').select('*').order('created_at',{ascending:false}).limit(1).single()
    setAnnouncement(ann)
  }

  const toggleTrack = async (targetId: string) => {
    if (!profile?.id) return
    const was = trackingMap[targetId]
    setTrackingMap(prev => ({ ...prev, [targetId]: !was }))
    if (was) {
      await supabase.from('trackers').delete().eq('tracker_id', profile.id).eq('tracked_id', targetId)
    } else {
      await supabase.from('trackers').insert({ tracker_id: profile.id, tracked_id: targetId })
    }
  }

  const filteredEntries = (() => {
    let list = allEntries
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.users?.username?.toLowerCase().includes(q) ||
        e.platform?.toLowerCase().includes(q)
      )
    }
    switch (filter) {
      case 'platform': {
        const seen = new Set<string>()
        return list.filter(e => { const p=(e.platform||'other').toLowerCase(); if(seen.has(p)) return false; seen.add(p); return true })
      }
      case 'content':
        return [...list].sort((a,b) => new Date(b.secured_at).getTime() - new Date(a.secured_at).getTime())
      case 'recent':
        return [...list].sort((a,b) => new Date(b.secured_at).getTime() - new Date(a.secured_at).getTime()).slice(0,20)
      default:
        return list
    }
  })()

  const filteredBuilders = search
    ? builders.filter(b => b.username?.toLowerCase().includes(search.toLowerCase()))
    : builders

  const maxPlatform = Math.max(...platformStats.map(p => p.count), 1)
  const myId = profile?.id || ''

  const FILTERS: { key: FilterType; label: string }[] = [
    { key:'all',      label:'All' },
    { key:'platform', label:'Platform' },
    { key:'content',  label:'All Content' },
    { key:'recent',   label:'Recent Activity' },
  ]

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  return (
    <DashboardLayout user={user}>
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h1 className="text-white text-[22px] md:text-[26px] font-bold tracking-tight">Discover Secured Records</h1>
            <p className="text-white/40 text-[13px] md:text-[14px] mt-1">Browse permanent entries across the network</p>
          </div>

          <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 mb-4" style={{ height:'46px' }}>
            <svg className="w-4 h-4 text-white/30 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creators, entries, platforms...."
              className="bg-transparent text-white/70 text-[13px] outline-none flex-1 placeholder-white/30" />
          </div>

          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map((f) => (
              <button key={f.key}
                onClick={() => { setFilter(f.key); if (f.key !== 'all') setTab('entries') }}
                className="px-4 py-[7px] rounded-full text-[13px] font-medium border transition-all flex-shrink-0"
                style={filter === f.key
                  ? { background:'#0038FF', borderColor:'#0038FF', color:'#fff' }
                  : { background:'transparent', borderColor:'rgba(255,255,255,0.14)', color:'rgba(255,255,255,0.55)' }
                }>
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative mb-6">
            <div className="flex gap-8">
              {(['creators', 'entries'] as const).map((t) => {
                const active = tab === t
                return (
                  <button key={t} onClick={() => setTab(t)}
                    className="pb-3 text-[14px] font-medium transition-colors relative capitalize"
                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background:'#0038FF' }} />}
                  </button>
                )
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background:'rgba(255,255,255,0.10)' }} />
          </div>

          {/* ── CREATORS ── */}
          {tab === 'creators' && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-bold text-[16px]">Recognized Builders</p>
                  <button className="text-white/40 text-[13px] hover:text-white transition-colors">See All</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredBuilders.slice(0, 4).map((b) => {
                    const strengthPct = Math.min(((b.profile_strength||0)/500)*100, 100)
                    return (
                      <div key={b.id}
                        className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3 cursor-pointer"
                        onClick={() => router.push(`/${b.username}`)}>
                        <Avatar src={b.avatar_url} name={b.username} size="lg" />
                        <div>
                          <p className="text-white font-semibold text-[13px] truncate">@{b.username}</p>
                          <p className="text-white/35 text-[11px] truncate">@{b.username}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white/45 text-[11px]">Identity Strength</span>
                            <span className="text-[12px] font-bold" style={{ color:'#6B8AFF' }}>{b.profile_strength||0}</span>
                          </div>
                          <div className="w-full h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${strengthPct}%`, background:'#0038FF' }} />
                          </div>
                        </div>
                        <TrackButton userId={b.id} myId={myId} trackingMap={trackingMap} onToggle={toggleTrack} variant="blue" />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {filteredBuilders.slice(4).map((b) => (
                  <div key={b.id}
                    className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3 cursor-pointer"
                    onClick={() => router.push(`/${b.username}`)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={b.avatar_url} name={b.username} size="md" />
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-[13px] truncate">@{b.username}</p>
                          <p className="text-white/35 text-[11px] truncate">@{b.username}</p>
                        </div>
                      </div>
                      <TrackButton userId={b.id} myId={myId} trackingMap={trackingMap} onToggle={toggleTrack} variant="pill" />
                    </div>
                    {b.bio && <p className="text-white/45 text-[12px] leading-relaxed line-clamp-2">{b.bio}</p>}
                    <div className="flex items-center gap-4">
                      {[
                        { label:'Strength',   val: b.profile_strength||0 },
                        { label:'Entries',    val: b.entry_count },
                        { label:'Tracked by', val: b.tracked_count },
                      ].map(s=>(
                        <div key={s.label} className="flex flex-col items-center">
                          <span className="text-[14px] font-bold" style={{ color:'#6B8AFF' }}>{s.val}</span>
                          <span className="text-white/35 text-[10px]">{s.label}</span>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const latest = allEntries.find(e => e.user_id === b.id)
                      if (!latest) return null
                      return (
                        <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2.5">
                          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <Image src={platformIcon(latest.platform)} alt={latest.platform} width={16} height={16} />
                          </div>
                          <p className="text-white/60 text-[12px] font-medium truncate flex-1">{latest.title}</p>
                          <span className="text-white/25 text-[11px] flex-shrink-0">{shortDate(latest.secured_at)}</span>
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ENTRIES ── */}
          {tab === 'entries' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-bold text-[16px]">
                  {filter==='all' ? 'Recent Entries' : filter==='platform' ? 'Entries by Platform' : filter==='content' ? 'All Content' : 'Recent Activity'}
                </p>
                <button className="text-white/40 text-[13px] hover:text-white transition-colors">See All</button>
              </div>

              {filteredEntries.length === 0 ? (
                <p className="text-white/20 text-[13px]">No entries found.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 cursor-pointer"
                          onClick={() => entry.users?.username && router.push(`/${entry.users.username}`)}>
                          <Avatar src={entry.users?.avatar_url} name={entry.users?.username||'?'} size="sm" />
                          <div>
                            <p className="text-white font-semibold text-[13px]">@{entry.users?.username}</p>
                            <p className="text-white/30 text-[11px]">@{entry.users?.username}</p>
                          </div>
                        </div>
                        <TrackButton userId={entry.users?.id||''} myId={myId} trackingMap={trackingMap} onToggle={toggleTrack} variant="pill" />
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                          <Image src={platformIcon(entry.platform)} alt={entry.platform||'platform'} width={18} height={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-[13px] leading-tight">{entry.title}</p>
                          {entry.description && (
                            <p className="text-white/35 text-[12px] mt-1 leading-relaxed line-clamp-2">{entry.description}</p>
                          )}
                        </div>
                      </div>

                      {entry.screenshot_url && (
                        <img src={entry.screenshot_url} alt=""
                          className="w-full rounded-xl object-cover" style={{ maxHeight:'200px' }} />
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                        <span className="text-[#6B8AFF] text-[12px]">{shortDate(entry.secured_at)}</span>
                        <button
                          onClick={() => entry.url && window.open(entry.url, '_blank', 'noopener,noreferrer')}
                          className="text-white/35 text-[12px] hover:text-white transition-colors flex items-center gap-1">
                          identify →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="hidden md:flex flex-shrink-0 flex-col gap-4" style={{ width:'280px' }}>
          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4">
            <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
              {[
                { label:'ENTRIES',  val: stats.entries>=1000?`${(stats.entries/1000).toFixed(1)}k`:String(stats.entries), color:'text-white' },
                { label:'CREATORS', val: stats.creators>=1000?`${(stats.creators/1000).toFixed(1)}k`:String(stats.creators), color:'text-white' },
                { label:'TODAY',    val: `+${stats.today}`, color:'text-green-400' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-0.5 px-2">
                  <p className={`text-[22px] font-bold leading-tight ${s.color}`}>{s.val}</p>
                  <p className="text-white/30 text-[10px] font-semibold tracking-[0.10em]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-white/55 text-[11px] font-bold tracking-[0.12em] uppercase">Leaderboard</p>
            {leaderboard.length === 0
              ? <p className="text-white/20 text-[12px]">No data yet.</p>
              : leaderboard.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Avatar src={u.avatar_url} name={u.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[12px] font-medium truncate">{u.username}</p>
                    <p className="text-white/30 text-[11px]">{u.profile_strength||0}pts</p>
                  </div>
                  <TrackButton userId={u.id} myId={myId} trackingMap={trackingMap} onToggle={toggleTrack} variant="pill" />
                </div>
              ))
            }
          </div>

          {platformStats.length > 0 && (
            <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white/55 text-[11px] font-bold tracking-[0.12em] uppercase">Secured by Platform</p>
              {platformStats.map((p) => (
                <div key={p.platform} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Image src={p.icon} alt={p.platform} width={18} height={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[12px] font-medium">{p.platform}</p>
                    <p className="text-white/30 text-[10px]">{p.count.toLocaleString()} entries</p>
                  </div>
                  <div className="w-16 h-[3px] bg-white/[0.07] rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{ width:`${(p.count/maxPlatform)*100}%`, background:'#0038FF' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {announcement && (
            <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color:'#0038FF' }}>New Feature</p>
              <p className="text-white font-semibold text-[13px] leading-tight">{announcement.title}</p>
              <p className="text-white/35 text-[11px] leading-relaxed line-clamp-3">{announcement.body}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}