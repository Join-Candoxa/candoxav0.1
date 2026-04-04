// app/[username]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import Image from 'next/image'

type Tab = 'secured' | 'activity' | 'badges'

function shortDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function platformIcon(platform: string) {
  const p = (platform || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
  const map: Record<string, string> = {
    youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
    twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
  }
  return map[p] ?? '/icons/others.png'
}

function Avatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'sm'|'md'|'lg'|'xl' }) {
  const i = (name || '?')[0].toUpperCase()
  const palette = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color = palette[i.charCodeAt(0) % palette.length]
  const sz = { sm:'w-8 h-8 text-[12px]', md:'w-10 h-10 text-[14px]', lg:'w-16 h-16 text-[20px]', xl:'w-20 h-20 text-[24px]' }[size]
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
    <span className="text-white font-bold">{i}</span>
  </div>
}

const BADGES = [
  { key:'beginner',   label:'Beginner',     sub:'210pts',       req:210 },
  { key:'builder',    label:'Builder',      sub:'50pts',        req:50  },
  { key:'founder',    label:'Sec. Founder', sub:'100pts',       req:100 },
  { key:'early',      label:'Early User',   sub:'Invite 5',     req:0   },
  { key:'consistent', label:'Consistent',   sub:'7-day streak', req:0   },
  { key:'networker',  label:'Networker',    sub:'Track 10',     req:0   },
]

function MsgIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

// ─── Contact Request Modal ────────────────────────────────────────────────────
// FIXED: receives targetEntries (the profile page's `entries` state = target user's entries)
function ContactRequestModal({ targetProfile, myProfile, targetEntries, onClose, onSent }: {
  targetProfile: any
  myProfile: any
  targetEntries: any[]   // ← target user's secured entries, not current user's
  onClose: () => void
  onSent: (convoId?: string) => void
}) {
  const [contextType,   setContextType]   = useState<'general'|'entry'>('general')
  const [selectedEntry, setSelectedEntry] = useState('')
  const [message,       setMessage]       = useState('')
  const [sending,       setSending]       = useState(false)
  const [existingConvo, setExistingConvo] = useState<string|null>(null)
  const [checking,      setChecking]      = useState(true)

  useEffect(() => {
    // Check if conversation already exists
    const p1 = myProfile.id < targetProfile.id ? myProfile.id : targetProfile.id
    const p2 = myProfile.id < targetProfile.id ? targetProfile.id : myProfile.id
    supabase.from('conversations').select('id')
      .eq('participant_1', p1).eq('participant_2', p2).maybeSingle()
      .then(({ data }) => {
        if (data) setExistingConvo(data.id)
        setChecking(false)
      })
  }, [])

  const handleSend = async () => {
    if (sending) return
    setSending(true)

    if (existingConvo) { onSent(existingConvo); return }

    await supabase.from('contact_requests').insert({
      sender_id:        myProfile.id,
      receiver_id:      targetProfile.id,
      context_entry_id: contextType === 'entry' && selectedEntry ? selectedEntry : null,
      message:          message.trim() || null,
      status:           'pending',
    })

    setSending(false)
    onSent()
  }

  if (checking) return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-[#0e0e14] border border-white/[0.12] rounded-2xl p-8 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-[#0e0e14] border border-white/[0.12] rounded-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto shadow-2xl">

          <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
            <div>
              <h2 className="text-white font-bold text-[16px]">
                {existingConvo ? 'Open Conversation' : 'Request to Connect'}
              </h2>
              <p className="text-white/40 text-[12px] mt-0.5">
                {existingConvo
                  ? 'You already have a conversation with this person.'
                  : 'They can accept or decline your request.'}
              </p>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-colors">✕</button>
          </div>

          {existingConvo ? (
            <div className="p-5">
              <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-5">
                <Avatar src={targetProfile.avatar_url} name={targetProfile.username} size="sm" />
                <div>
                  <p className="text-white font-medium text-[14px]">@{targetProfile.username}</p>
                  <p className="text-white/35 text-[11px]">Conversation already exists</p>
                </div>
              </div>
              <button onClick={() => onSent(existingConvo)}
                className="w-full py-3 rounded-xl text-white text-[14px] font-semibold"
                style={{ background:'#0038FF' }}>
                Open Conversation →
              </button>
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-4">
              {/* Target preview */}
              <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
                <Avatar src={targetProfile.avatar_url} name={targetProfile.username} size="sm" />
                <div>
                  <p className="text-white font-medium text-[14px]">@{targetProfile.username}</p>
                  <p className="text-white/35 text-[11px]">{targetProfile.bio?.slice(0, 60) || 'No bio'}</p>
                </div>
              </div>

              {/* Context type */}
              <div>
                <p className="text-white/55 text-[12px] font-semibold mb-2">Attach Context</p>
                <div className="flex gap-2 mb-3">
                  {[
                    { val:'general', label:'General Request' },
                    { val:'entry',   label:"Their Secured Entry" },
                  ].map(({ val, label }) => (
                    <button key={val} onClick={() => setContextType(val as any)}
                      className="flex-1 py-2 rounded-xl text-[12px] font-medium border transition-colors"
                      style={contextType === val
                        ? { background:'rgba(0,56,255,0.15)', borderColor:'rgba(0,56,255,0.50)', color:'#6B8AFF' }
                        : { background:'transparent', borderColor:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.50)' }
                      }>
                      {label}
                    </button>
                  ))}
                </div>

                {/* FIXED: shows TARGET user's entries (targetEntries prop) */}
                {contextType === 'entry' && (
                  targetEntries.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                      {targetEntries.map((e) => (
                        <button key={e.id} onClick={() => setSelectedEntry(e.id)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors text-left"
                          style={selectedEntry === e.id
                            ? { borderColor:'rgba(0,56,255,0.50)', background:'rgba(0,56,255,0.10)' }
                            : { borderColor:'rgba(255,255,255,0.08)', background:'transparent' }
                          }>
                          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <Image src={platformIcon(e.platform)} alt={e.platform} width={14} height={14} />
                          </div>
                          <p className="text-white/70 text-[12px] truncate flex-1">{e.title}</p>
                          {selectedEntry === e.id && <span className="text-blue-400 text-[12px] flex-shrink-0">✓</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/30 text-[12px] text-center py-3">This user has no secured entries yet.</p>
                  )
                )}
              </div>

              {/* Message */}
              <div>
                <p className="text-white/55 text-[12px] font-semibold mb-2">Message <span className="text-white/25 font-normal">(optional)</span></p>
                <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} rows={3}
                  placeholder="Why are you reaching out?"
                  className="w-full bg-[#0a0a12] border border-white/[0.10] rounded-xl px-4 py-3 text-white/70 text-[13px] outline-none resize-none placeholder-white/25 focus:border-white/20" />
                <p className="text-white/25 text-[11px] mt-1 text-right">{message.length}/200</p>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-semibold">Cancel</button>
                <button onClick={handleSend} disabled={sending}
                  className="flex-1 py-3 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50"
                  style={{ background:'#0038FF' }}>
                  {sending ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const router = useRouter()

  const [currentUser,    setCurrentUser]    = useState<any>(null)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [profile,        setProfile]        = useState<any>(null)
  const [entries,        setEntries]        = useState<any[]>([])  // target user's entries
  const [trackers,       setTrackers]       = useState<any[]>([])
  const [trackerCount,   setTrackerCount]   = useState(0)
  const [trackingCount,  setTrackingCount]  = useState(0)
  const [isTracking,     setIsTracking]     = useState(false)
  const [copied,         setCopied]         = useState<'profile'|'referral'|null>(null)
  const [tab,            setTab]            = useState<Tab>('secured')
  const [platformCounts, setPlatformCounts] = useState<{ platform: string; icon: string; count: number }[]>([])
  const [dailyUsed,      setDailyUsed]      = useState(0)
  const [dailyLimit]                        = useState(10)
  const [activity,       setActivity]       = useState<any[]>([])
  const [showMessage,    setShowMessage]    = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setCurrentUser(session.user)
      supabase.from('users').select('*').eq('email', session.user.email).single()
        .then(({ data }) => setCurrentProfile(data))
    })
  }, [])

  useEffect(() => {
    if (!username) return
    fetchProfile((username as string).replace('@', ''))
  }, [username])

  const fetchProfile = async (slug: string) => {
    const { data: prof } = await supabase.from('users').select('*').eq('username', slug).single()
    if (!prof) return
    setProfile(prof)

    const { data: ents } = await supabase.from('entries').select('*')
      .eq('user_id', prof.id).order('secured_at', { ascending: false })
    setEntries(ents || [])

    const { data: trackerRows } = await supabase.from('trackers')
      .select('tracker_id, users!trackers_tracker_id_fkey(username, avatar_url, profile_strength)')
      .eq('tracked_id', prof.id).limit(4)
    setTrackers((trackerRows || []).map((r: any) => ({ ...r.users, id: r.tracker_id })))

    const { count: tby }  = await supabase.from('trackers').select('*', { count:'exact', head:true }).eq('tracked_id', prof.id)
    const { count: ting } = await supabase.from('trackers').select('*', { count:'exact', head:true }).eq('tracker_id', prof.id)
    setTrackerCount(tby || 0)
    setTrackingCount(ting || 0)

    const pmap: Record<string, number> = {}
    ;(ents || []).forEach((e: any) => {
      const k = (e.platform || 'other').toLowerCase().replace(/\s*\(.*?\)\s*/g,'').trim()
      pmap[k] = (pmap[k] || 0) + 1
    })
    const iconMap:  Record<string,string> = { twitter:'/icons/x.png', x:'/icons/x.png', youtube:'/icons/youtube.png', instagram:'/icons/instagram.png', linkedin:'/icons/linkedin.png' }
    const labelMap: Record<string,string> = { twitter:'Twitter', x:'Twitter', youtube:'YouTube', instagram:'Instagram', linkedin:'LinkedIn', github:'GitHub' }
    setPlatformCounts(Object.entries(pmap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v]) => ({ platform:labelMap[k]||k, icon:iconMap[k]||'/icons/others.png', count:v })))

    const todayMid = new Date(); todayMid.setHours(0,0,0,0)
    const { count: dc } = await supabase.from('entries').select('*', { count:'exact', head:true })
      .eq('user_id', prof.id).gte('secured_at', todayMid.toISOString())
    setDailyUsed(dc || 0)
    setActivity((ents || []).slice(0, 10).map((e: any) => ({ type:'secured', title:`Secured "${e.title}"`, date:e.secured_at, points:5 })))
  }

  useEffect(() => {
    if (!currentProfile?.id || !profile?.id) return
    supabase.from('trackers').select('id', { count:'exact', head:true })
      .eq('tracker_id', currentProfile.id).eq('tracked_id', profile.id)
      .then(({ count }) => setIsTracking((count || 0) > 0))
  }, [currentProfile, profile])

  const toggleTrack = async () => {
    if (!currentProfile?.id || !profile?.id) return
    if (isTracking) {
      await supabase.from('trackers').delete().eq('tracker_id', currentProfile.id).eq('tracked_id', profile.id)
    } else {
      await supabase.from('trackers').insert({ tracker_id: currentProfile.id, tracked_id: profile.id })
    }
    setIsTracking(!isTracking)
    setTrackerCount(prev => isTracking ? prev - 1 : prev + 1)
  }

  const handleMessageSent = (convoId?: string) => {
    setShowMessage(false)
    if (convoId) router.push(`/messages/${convoId}`)
  }

  const copyProfileLink  = () => { navigator.clipboard.writeText(`${window.location.origin}/${profile?.username}`); setCopied('profile'); setTimeout(() => setCopied(null), 2000) }
  const copyReferralLink = () => { navigator.clipboard.writeText(`${window.location.origin}/onboarding?ref=${profile?.username}`); setCopied('referral'); setTimeout(() => setCopied(null), 2000) }

  const strengthPct = Math.min(((profile?.profile_strength || 0) / 500) * 100, 100)
  const dailyPct    = Math.min((dailyUsed / dailyLimit) * 100, 100)
  const isOwn       = currentProfile?.id === profile?.id

  const strengthLabel = (s: number) => {
    if (s >= 200) return 'Secured Founder'
    if (s >= 100) return 'Builder'
    if (s >= 50)  return 'Beginner'
    return 'Getting started'
  }

  if (!profile || !currentUser) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  const EntryCard = ({ entry }: { entry: any }) => (
    <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 md:p-5 flex flex-col gap-3 md:gap-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center">
          <Image src={platformIcon(entry.platform)} alt={entry.platform} width={20} height={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-[13px] md:text-[14px] leading-tight">{entry.title}</p>
          {entry.description && <p className="text-white/40 text-[12px] mt-1 line-clamp-2">{entry.description}</p>}
        </div>
      </div>
      {entry.screenshot_url && <img src={entry.screenshot_url} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight:'200px' }} />}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full border"
            style={{ background:'rgba(0,56,255,0.12)', borderColor:'rgba(0,56,255,0.30)', color:'#6B8AFF' }}>Secured</span>
          <span className="text-white/25 text-[11px]">{shortDate(entry.secured_at)}</span>
        </div>
        <button onClick={() => entry.url && window.open(entry.url, '_blank', 'noopener,noreferrer')}
          className="text-white/35 text-[12px] hover:text-white transition-colors">identify →</button>
      </div>
    </div>
  )

  // ── Action buttons shared ──────────────────────────────────────────────────
  const ActionButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex items-center gap-2 ${mobile ? 'flex-wrap justify-end' : ''}`}>
      <button onClick={copyProfileLink}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.12] text-white/55 text-[12px] font-medium hover:bg-white/[0.05] transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        {copied === 'profile' ? 'Copied!' : 'Copy'}
      </button>

      {isOwn && (
        <button onClick={copyReferralLink}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.12] text-white/55 text-[12px] font-medium hover:bg-white/[0.05] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
          </svg>
          {copied === 'referral' ? 'Copied!' : 'Refer'}
        </button>
      )}

      {/* Message button — beside Track, only on other profiles */}
      {!isOwn && (
        <button onClick={() => setShowMessage(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.12] text-white/55 text-[12px] font-medium hover:border-blue-500/40 hover:text-blue-300 transition-colors">
          <MsgIcon /> Message
        </button>
      )}

      {!isOwn && (
        <button onClick={toggleTrack}
          className="px-4 py-2 rounded-xl text-white text-[13px] font-semibold transition-all flex items-center gap-1.5"
          style={isTracking
            ? { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)' }
            : { background:'#0038FF' }
          }>
          {isTracking ? <><span className="text-green-400 text-[11px]">✓</span> Tracking</> : 'Track'}
        </button>
      )}
    </div>
  )

  return (
    <DashboardLayout user={currentUser}>

      {/* ── MOBILE ── */}
      <div className="md:hidden flex flex-col">
        <div className="mb-5">
          <div className="flex items-start justify-between mb-3">
            <Avatar src={profile.avatar_url} name={profile.username} size="lg" />
            <ActionButtons mobile />
          </div>
          <h1 className="text-white text-[18px] font-bold mb-0.5">@{profile.username}</h1>
          <p className="text-white/35 text-[12px] mb-2">@{profile.username}</p>
          {profile.bio && <p className="text-white/55 text-[13px] leading-relaxed">{profile.bio}</p>}
        </div>

        <div className="grid grid-cols-4 border border-white/[0.08] rounded-xl overflow-hidden mb-4">
          {[{label:'Entries',val:entries.length},{label:'Tracked by',val:trackerCount},{label:'Tracking',val:trackingCount},{label:'Strength',val:profile.profile_strength||0}]
            .map((s, i, arr) => (
            <div key={s.label} className={`flex flex-col items-center py-3 bg-[#0A0A0F] ${i < arr.length-1 ? 'border-r border-white/[0.08]' : ''}`}>
              <p className="text-[14px] font-bold" style={{ color:'#6B8AFF' }}>{s.val}</p>
              <p className="text-white/35 text-[10px] mt-0.5 leading-tight text-center">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="border border-white/[0.08] bg-[#0A0A0F] rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/45 text-[12px]">Profile Strength</span>
            <span className="text-[12px] font-semibold text-white">{profile.profile_strength||0}pts <span style={{ color:'#6B8AFF' }}>{strengthLabel(profile.profile_strength||0)}</span></span>
          </div>
          <div className="w-full h-[4px] bg-white/[0.07] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width:`${strengthPct}%`, background:'#0038FF' }} />
          </div>
        </div>

        <div className="relative mb-5">
          <div className="flex">
            {(['secured','activity','badges'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className="flex-1 pb-3 text-[13px] font-medium transition-colors relative"
                style={{ color: tab===t ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                {t==='secured'?'Secured':t==='activity'?'Activity':'Badges'}
                {tab===t && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background:'#0038FF' }} />}
              </button>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background:'rgba(255,255,255,0.08)' }} />
        </div>

        {tab==='secured' && (
          <div className="flex flex-col gap-3">
            {entries.length===0?<p className="text-white/20 text-[13px] text-center py-10">No secured entries yet.</p>
              :entries.map(e=><EntryCard key={e.id} entry={e}/>)}
          </div>
        )}
        {tab==='activity' && (
          <div className="flex flex-col gap-3">
            {activity.length===0?<p className="text-white/20 text-[13px] text-center py-10">No activity yet.</p>
              :activity.map((item,idx)=>(
              <div key={idx} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.09] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-[13px] font-medium truncate">{item.title}</p>
                  <p className="text-white/30 text-[11px]">{shortDate(item.date)}</p>
                </div>
                {item.points>0&&<span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">+{item.points}pts</span>}
              </div>
            ))}
          </div>
        )}
        {tab==='badges' && (
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map(badge=>{
              const earned=badge.req===0||(profile.profile_strength||0)>=badge.req
              return(
                <div key={badge.key} className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 text-center ${earned?'border-blue-500/30 bg-blue-600/10':'border-white/[0.07] bg-[#0A0A0F] opacity-50'}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:earned?'#0038FF':'rgba(255,255,255,0.06)'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={earned?'white':'rgba(255,255,255,0.3)'} strokeWidth="1.5" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <p className={`text-[11px] font-semibold leading-tight ${earned?'text-blue-400':'text-white/30'}`}>{badge.label}</p>
                  <p className="text-white/30 text-[10px]">{badge.sub}</p>
                </div>
              )
            })}
          </div>
        )}

        {platformCounts.length>0&&(
          <div className="border border-white/[0.08] bg-[#0A0A0F] rounded-xl p-4 mt-5 flex flex-col gap-3">
            <p className="text-white/45 text-[11px] font-semibold tracking-[0.12em] uppercase">Platforms Used</p>
            {platformCounts.map(p=>(
              <div key={p.platform} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Image src={p.icon} alt={p.platform} width={18} height={18} />
                </div>
                <p className="text-white/70 text-[12px] font-medium flex-1">{p.platform}</p>
                <span className="text-white/35 text-[11px]">{p.count} {p.count===1?'entry':'entries'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:flex gap-5">
        <div className="flex-1 min-w-0">
          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-6 mb-5">
            <div className="flex items-start gap-5 mb-5">
              <Avatar src={profile.avatar_url} name={profile.username} size="xl" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-white text-[22px] font-bold tracking-tight">@{profile.username}</h1>
                    <p className="text-white/35 text-[13px] mt-0.5">@{profile.username}</p>
                    <p className="text-white/55 text-[13px] mt-2 leading-relaxed line-clamp-2">{profile.bio||'No bio yet.'}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ActionButtons />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-white/[0.08] border border-white/[0.08] rounded-xl overflow-hidden">
              {[{label:'Entries',val:entries.length},{label:'Tracked by',val:trackerCount},{label:'Tracking',val:trackingCount},{label:'Strength',val:profile.profile_strength||0}]
                .map(s=>(
                <div key={s.label} className="flex flex-col items-center py-4 gap-1">
                  <p className="text-[22px] font-bold" style={{color:'#6B8AFF'}}>{s.val}</p>
                  <p className="text-white/35 text-[12px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex border-b border-white/[0.08] mb-5">
            {(['secured','activity','badges'] as Tab[]).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`pb-3 mr-8 text-[14px] font-medium transition-colors relative capitalize ${tab===t?'text-white':'text-white/35 hover:text-white/60'}`}>
                {t==='secured'?'All Secured':t==='activity'?'Activity':'Badges'}
                {tab===t&&<span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{background:'#0038FF'}}/>}
              </button>
            ))}
          </div>

          {tab==='secured'&&(
            <div className="space-y-4">
              {entries.length===0?<p className="text-white/20 text-[13px]">No secured entries yet.</p>
                :entries.map(e=><EntryCard key={e.id} entry={e}/>)}
            </div>
          )}
          {tab==='activity'&&(
            <div className="space-y-3">
              {activity.length===0?<p className="text-white/20 text-[13px]">No activity yet.</p>
                :activity.map((item,idx)=>(
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.09] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" className="w-5 h-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[13px] font-medium">{item.title}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{shortDate(item.date)}</p>
                  </div>
                  {item.points>0&&<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">+{item.points}pts</span>}
                </div>
              ))}
            </div>
          )}
          {tab==='badges'&&(
            <div>
              <p className="text-white font-semibold text-[15px] mb-4">Badges & Milestones</p>
              <div className="grid grid-cols-3 gap-4">
                {BADGES.map(badge=>{
                  const earned=badge.req===0||(profile.profile_strength||0)>=badge.req
                  return(
                    <div key={badge.key} className={`border rounded-2xl p-5 flex flex-col items-center gap-2 text-center ${earned?'border-blue-500/30 bg-blue-600/10':'border-white/[0.07] bg-[#0A0A0F] opacity-50'}`}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:earned?'#0038FF':'rgba(255,255,255,0.06)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={earned?'white':'rgba(255,255,255,0.3)'} strokeWidth="1.5" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <p className={`text-[13px] font-semibold ${earned?'text-blue-400':'text-white/30'}`}>{badge.label}</p>
                      <p className="text-white/40 text-[11px]">{badge.sub}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex-shrink-0 flex flex-col gap-4" style={{width:'280px'}}>
          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4">
            <p className="text-white/45 text-[11px] font-semibold tracking-[0.12em] uppercase mb-2">Profile Strength</p>
            <div className="flex items-baseline gap-2 mb-1.5">
              <p className="text-white text-[28px] font-bold leading-none">{profile.profile_strength||0}pts</p>
              <p className="text-white/40 text-[12px]">{strengthLabel(profile.profile_strength||0)}</p>
            </div>
            <div className="w-full h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:`${strengthPct}%`,background:'#0038FF'}}/>
            </div>
          </div>

          {isOwn&&(
            <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4">
              <p className="text-white/45 text-[11px] font-semibold tracking-[0.12em] uppercase mb-2">Daily Secure Limit</p>
              <p className="text-white text-[24px] font-bold leading-none mb-0.5">{dailyUsed}/{dailyLimit}</p>
              <p className="text-white/35 text-[11px] mb-2">Used today</p>
              <div className="w-full h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${dailyPct}%`,background:dailyPct>=80?'#f97316':'#0038FF'}}/>
              </div>
            </div>
          )}

          {platformCounts.length>0&&(
            <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white/45 text-[11px] font-semibold tracking-[0.12em] uppercase">Connected Platforms</p>
              {platformCounts.map(p=>(
                <div key={p.platform} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Image src={p.icon} alt={p.platform} width={18} height={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[12px] font-medium">{p.platform}</p>
                    <p className="text-white/30 text-[10px]">{p.count.toLocaleString()} entries</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"/>
                </div>
              ))}
            </div>
          )}

          {trackers.length>0&&(
            <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white/45 text-[11px] font-semibold tracking-[0.12em] uppercase">Tracked By</p>
              {trackers.map(t=>(
                <div key={t.id} className="flex items-center gap-2.5 cursor-pointer" onClick={()=>router.push(`/${t.username}`)}>
                  <Avatar src={t.avatar_url} name={t.username} size="sm"/>
                  <p className="text-white/70 text-[12px] font-medium flex-1 truncate">{t.username}</p>
                  <span className="text-white/35 text-[11px] flex-shrink-0">{t.profile_strength||0}pts</span>
                </div>
              ))}
              {trackerCount>4&&(
                <button className="text-white/35 text-[11px] hover:text-white/60 transition-colors text-center">
                  +{trackerCount-4} more trackers →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact Request Modal — passes target's entries */}
      {showMessage && currentProfile && (
        <ContactRequestModal
          targetProfile={profile}
          myProfile={currentProfile}
          targetEntries={entries}
          onClose={() => setShowMessage(false)}
          onSent={handleMessageSent}
        />
      )}
    </DashboardLayout>
  )
}