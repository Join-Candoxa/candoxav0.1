// components/profile/ProfilePage.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

function platformIcon(platform: string) {
  const p = (platform || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
  const map: Record<string, string> = {
    youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
    twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
  }
  return map[p] ?? '/icons/others.png'
}

function shortDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fullDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}

const BADGES = [
  { id: 'beginner',    label: 'Beginner',     sub: '210',          icon: '⚡', req: (p: any) => (p?.profile_strength||0) >= 0   },
  { id: 'builder',     label: 'Builder',      sub: '50pts',        icon: '🔒', req: (p: any) => (p?.profile_strength||0) >= 50  },
  { id: 'sec_founder', label: 'Sec. Founder', sub: '100 pts',      icon: '⭐', req: (p: any) => (p?.profile_strength||0) >= 100 },
  { id: 'early_user',  label: 'Early User',   sub: 'Invite 5',     icon: '🕐', req: (_: any) => false },
  { id: 'consistent',  label: 'Consistent',   sub: '7-day streak', icon: '📅', req: (_: any) => false },
  { id: 'networker',   label: 'Networker',    sub: 'Track 10',     icon: '👥', req: (_: any) => false },
]

function ReceiptSheet({ entry, profile, onClose }: { entry: any; profile: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyHash = () => {
    navigator.clipboard.writeText(entry.blockchain_ref)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col"
        style={{ background:'#0D0D14', borderRadius:'20px 20px 0 0', border:'1px solid rgba(255,255,255,0.10)', borderBottom:'none', padding:'20px 16px 40px', maxHeight:'90vh', overflowY:'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-4 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-white text-[18px] font-bold">Human-Readable Receipt</h2>
            <p className="text-white/40 text-[12px] mt-0.5">Secured Entry · Blockchain Verified</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.10] flex items-center justify-center text-white/60 flex-shrink-0 ml-3">✕</button>
        </div>

        {/* Onchain badge */}
        {entry.blockchain_ref && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-green-400 text-[12px] font-semibold">Anchored on Base blockchain</span>
          </div>
        )}

        {/* Receipt rows */}
        <div className="border border-white/[0.10] rounded-xl overflow-hidden mb-4">
          {[
            { label: 'Entry',      value: entry.title,                         color: 'rgba(255,255,255,0.80)' },
            { label: 'Creator',    value: `@${profile?.username || '—'}`,       color: 'rgba(255,255,255,0.80)' },
            { label: 'Platform',   value: entry.platform || '—',               color: 'rgba(255,255,255,0.80)' },
            { label: 'Secured On', value: fullDateTime(entry.secured_at),       color: 'rgba(255,255,255,0.80)' },
            { label: 'Status',     value: '● Secured · Indelible',             color: '#4ade80' },
            { label: 'Chain',      value: entry.chain ? `${entry.chain.charAt(0).toUpperCase() + entry.chain.slice(1)} (Ethereum L2)` : 'Base (Ethereum L2)', color: '#6B8AFF' },
            { label: 'Block',      value: entry.block_number ? `#${entry.block_number}` : '— (pending)', color: 'rgba(255,255,255,0.80)' },
          ].map((row, i, arr) => (
            <div key={row.label}
              className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
              <span className="text-[#6B8AFF] text-[13px] font-medium">{row.label}</span>
              <span className="text-[13px] font-medium text-right ml-4" style={{ color: row.color }}>{row.value}</span>
            </div>
          ))}

          {/* Blockchain ref row — copyable */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-white/[0.06]">
            <span className="text-[#6B8AFF] text-[13px] font-medium">Tx Hash</span>
            {entry.blockchain_ref ? (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-white/55 text-[12px] font-mono">
                  {entry.blockchain_ref.slice(0, 8)}...{entry.blockchain_ref.slice(-6)}
                </span>
                <button onClick={copyHash}
                  className="text-white/40 hover:text-white/70 transition-colors text-[11px] border border-white/[0.10] rounded px-2 py-0.5 flex-shrink-0">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : (
              <span className="text-[13px] font-medium text-right ml-4" style={{ color:'rgba(255,255,255,0.35)' }}>— (pending)</span>
            )}
          </div>
        </div>

        {/* Basescan button — only shown when blockchain_ref exists */}
        {entry.blockchain_ref && (
          <a
            href={`https://basescan.org/tx/${entry.blockchain_ref}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl border border-blue-500/30 text-blue-300 text-[14px] font-semibold hover:bg-blue-500/10 transition-colors mb-3"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            View on Basescan
          </a>
        )}

        <button onClick={onClose}
          className="w-full py-3 rounded-xl border border-white/[0.10] text-white/50 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">
          Close
        </button>
      </div>
    </>
  )
}

export default function ProfilePage({ user }: { user: any }) {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile,       setProfile]       = useState<any>(null)
  const [entries,       setEntries]       = useState<any[]>([])
  const [trackerCount,  setTrackerCount]  = useState(0)
  const [trackingCount, setTrackingCount] = useState(0)
  const [activeTab,     setActiveTab]     = useState<'secured'|'about'|'badge'>('secured')
  const [receipt,       setReceipt]       = useState<any | null>(null)

  const [editing,       setEditing]       = useState(false)
  const [displayName,   setDisplayName]   = useState('')
  const [bio,           setBio]           = useState('')
  const [location,      setLocation]      = useState('')
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [saveMsg,       setSaveMsg]       = useState('')

  useEffect(() => {
    const load = async () => {
      let p: any = null
      if (user.email) {
        const { data } = await supabase.from('users').select('*').eq('email', user.email).maybeSingle()
        p = data
      }
      if (!p && user.id) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
        p = data
      }
      if (p) {
        setProfile(p)
        setDisplayName(p.display_name || '')
        setBio(p.bio || '')
        setLocation(p.location || '')
        setAvatarUrl(p.avatar_url || null)

        const { data: e } = await supabase.from('entries').select('*').eq('user_id', p.id)
          .eq('status', 'secured').order('secured_at', { ascending: false })
        setEntries(e || [])

        const [{ count: tby }, { count: ting }] = await Promise.all([
          supabase.from('trackers').select('*', { count:'exact', head:true }).eq('tracked_id', p.id),
          supabase.from('trackers').select('*', { count:'exact', head:true }).eq('tracker_id', p.id),
        ])
        setTrackerCount(tby || 0)
        setTrackingCount(ting || 0)
      }
    }
    load()
  }, [user])

  const handleSave = async () => {
    if (!profile?.id) { setSaveMsg('Error: profile not loaded'); return }
    setSaving(true); setSaveMsg('')

    let newAvatarUrl = avatarUrl
    if (avatarFile) {
      const ext  = avatarFile.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (uploadErr) { setSaveMsg('Avatar upload failed: ' + uploadErr.message); setSaving(false); return }
      const { data: ud } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = `${ud.publicUrl}?t=${Date.now()}`
    }

    const payload = { display_name: displayName, bio, location, avatar_url: newAvatarUrl }
    const { error: updateErr } = await supabase.from('users').update(payload).eq('id', profile.id)

    if (updateErr) { setSaveMsg('Save failed: ' + updateErr.message); setSaving(false); return }

    setProfile({ ...profile, ...payload })
    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null); setAvatarPreview(null); setEditing(false); setSaving(false)
    setSaveMsg('Saved!'); setTimeout(() => setSaveMsg(''), 2000)
  }

  const displayAvatar = avatarPreview || avatarUrl
  const name          = profile?.display_name || profile?.username || ''
  const initials      = (name || 'U')[0].toUpperCase()
  const palette       = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const avatarBg      = palette[initials.charCodeAt(0) % palette.length]
  const strength      = profile?.profile_strength || 0
  const strengthPct   = Math.min((strength / 500) * 100, 100)
  const strengthTier  = strength === 0 ? 'Beginner' : strength < 100 ? 'Rising' : strength < 250 ? 'Verified' : strength < 400 ? 'Pro' : 'Elite'

  const usedPlatforms = [...new Set(entries.map(e => {
    const p = (e.platform||'').toLowerCase().replace(/\s*\(.*?\)\s*/g,'').trim()
    const labels: Record<string,string> = { twitter:'X', x:'X', youtube:'YouTube', instagram:'Instagram', linkedin:'LinkedIn', github:'GitHub' }
    return labels[p] || e.platform
  }))].slice(0, 5).join(' · ')

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month:'long', year:'numeric' })
    : 'January 2025'

  const TABS: { key:'secured'|'about'|'badge'; label:string }[] = [
    { key:'secured', label:'Secured' },
    { key:'about',   label:'About'   },
    { key:'badge',   label:'Badge'   },
  ]

  const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )

  const MessagesIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )

  return (
    <>
      {/* ════ MOBILE ════ */}
      <div className="md:hidden flex flex-col">

        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-white text-[22px] font-bold flex-1">My Profile</h1>
          <button onClick={() => router.push('/messages')}
            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
            <MessagesIcon />
          </button>
          <button onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
            <SettingsIcon />
          </button>
        </div>

        {/* Avatar + buttons */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ${editing ? 'cursor-pointer ring-2 ring-blue-500/60' : ''}`}
            onClick={() => editing && fileRef.current?.click()}>
            {displayAvatar
              ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
              : <div className={`w-full h-full flex items-center justify-center ${avatarBg}`}>
                  <span className="text-white text-[20px] font-bold">{initials}</span>
                </div>
            }
          </div>
          <div className="flex-1" />
          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${profile?.username}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.15] text-white/70 text-[13px] font-medium">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copy
          </button>
          {editing ? (
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-full text-white text-[13px] font-semibold disabled:opacity-50"
              style={{ background:'#0038FF' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-full text-white text-[13px] font-semibold"
              style={{ background:'#0038FF' }}>
              Edit
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) } }} />

        {saveMsg && (
          <p className={`text-[12px] mb-3 ${saveMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</p>
        )}

        <div className="mb-3">
          {editing ? (
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[16px] font-bold outline-none w-full mb-1 focus:border-blue-500" />
          ) : (
            <p className="text-white text-[16px] font-bold">{profile?.display_name || profile?.username}</p>
          )}
          <p className="text-white/40 text-[13px]">@{profile?.username}</p>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2 mb-4">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
              placeholder="Write a short bio..."
              className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white/80 text-[13px] outline-none resize-none focus:border-blue-500" />
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Lagos, Nigeria)"
              className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white/80 text-[13px] outline-none focus:border-blue-500" />
          </div>
        ) : (
          profile?.bio && <p className="text-white/60 text-[13px] leading-relaxed mb-4">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 mb-4" style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
          {[
            { label:'Entries',    value: entries.length },
            { label:'Tracked by', value: trackerCount },
            { label:'Tracking',   value: trackingCount },
            { label:'Strength',   value: strength },
          ].map((s, i, arr) => (
            <div key={s.label}
              className={`flex flex-col items-center py-3 bg-[#0A0A0F] ${i < arr.length-1 ? 'border-r border-white/[0.08]' : ''}`}>
              <p className="text-[15px] font-bold" style={{ color:'#6B8AFF' }}>{s.value}</p>
              <p className="text-white/35 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Strength bar */}
        <div className="border border-white/[0.08] bg-[#0A0A0F] rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/55 text-[12px] font-medium">Profile Strength</span>
            <span className="text-[12px] font-semibold">
              <span className="text-white">{strength}pts</span>{' '}
              <span style={{ color:'#6B8AFF' }}>{strengthTier}</span>
            </span>
          </div>
          <div className="w-full h-[4px] bg-white/[0.07] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width:`${strengthPct}%`, background:'#0038FF' }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mb-5">
          <div className="flex">
            {TABS.map((t) => {
              const active = activeTab === t.key
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="flex-1 pb-3 text-[14px] font-medium transition-colors relative"
                  style={{ color: active ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                  {t.label}
                  {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background:'#0038FF' }} />}
                </button>
              )
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background:'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Secured */}
        {activeTab === 'secured' && (
          <div className="flex flex-col gap-3">
            {entries.length === 0
              ? <p className="text-white/25 text-[13px] text-center py-10">No secured entries yet.</p>
              : entries.map((entry) => (
                <div key={entry.id}
                  className="border border-white/[0.10] bg-[#0A0A0F] rounded-xl p-4 flex flex-col gap-3 cursor-pointer"
                  onClick={() => setReceipt(entry)}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <Image src={platformIcon(entry.platform)} alt={entry.platform} width={20} height={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-[13px] leading-tight">{entry.title}</p>
                      {entry.description && <p className="text-white/40 text-[12px] mt-1 line-clamp-2">{entry.description}</p>}
                    </div>
                  </div>
                  {entry.screenshot_url && (
                    <img src={entry.screenshot_url} alt="screenshot" className="w-full rounded-xl object-cover" style={{ maxHeight:'200px' }} />
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      {entry.blockchain_ref ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border"
                          style={{ background:'rgba(0,56,255,0.12)', borderColor:'rgba(0,56,255,0.30)', color:'#6B8AFF' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                          Onchain
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                          style={{ background:'rgba(0,56,255,0.12)', borderColor:'rgba(0,56,255,0.30)', color:'#6B8AFF' }}>
                          Secured
                        </span>
                      )}
                      <span className="text-white/30 text-[11px]">{shortDate(entry.secured_at)}</span>
                    </div>
                    <span className="text-white/35 text-[12px]">identify →</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* About */}
        {activeTab === 'about' && (
          <div className="flex flex-col gap-3">
            <div className="border border-white/[0.08] bg-[#0A0A0F] rounded-xl overflow-hidden">
              {[
                { icon:'👤', label:'CREATOR TYPE', value: profile?.creator_type || 'Indie Maker · Newsletter writer · Build-in-public' },
                { icon:'🛡', label:'MEMBER SINCE',  value: `${memberSince} — Early User` },
                { icon:'📍', label:'LOCATION',      value: profile?.location || '—' },
                { icon:'📺', label:'PLATFORMS',     value: usedPlatforms || '—' },
              ].map((row, i, arr) => (
                <div key={row.label}
                  className={`flex items-start gap-3 px-4 py-3.5 ${i < arr.length-1 ? 'border-b border-white/[0.06]' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-[14px]">{row.icon}</div>
                  <div>
                    <p className="text-white/40 text-[10px] font-semibold tracking-[0.10em] mb-0.5">{row.label}</p>
                    <p className="text-white/75 text-[13px] leading-relaxed">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border border-white/[0.08] bg-[#0A0A0F] rounded-xl p-4">
              <p className="text-[11px] font-bold tracking-[0.12em] mb-2" style={{ color:'#0038FF' }}>CANDOXA RECORD</p>
              <p className="text-white/55 text-[13px] leading-relaxed">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} permanently secured. Identity timestamped and indelible.
              </p>
            </div>
          </div>
        )}

        {/* Badge */}
        {activeTab === 'badge' && (
          <div className="flex flex-col gap-4">
            <p className="text-white/45 text-[13px] leading-relaxed">Badges are earned automatically as you grow your profile strength and community.</p>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((badge) => {
                const earned = badge.req(profile)
                return (
                  <div key={badge.id} className="border rounded-xl p-4 flex flex-col items-center gap-2 text-center"
                    style={earned ? { borderColor:'rgba(0,56,255,0.40)', background:'rgba(0,56,255,0.08)' } : { borderColor:'rgba(255,255,255,0.08)', background:'#0A0A0F' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px]"
                      style={earned ? { background:'#0038FF' } : { background:'rgba(255,255,255,0.06)' }}>
                      {badge.icon}
                    </div>
                    <div>
                      <p className="text-white text-[11px] font-semibold leading-tight">{badge.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: earned ? '#6B8AFF' : 'rgba(255,255,255,0.35)' }}>{badge.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ════ DESKTOP ════ */}
      <div className="hidden md:block max-w-3xl mx-auto">

        <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <div onClick={() => editing && fileRef.current?.click()}
                  className={`w-16 h-16 rounded-full overflow-hidden ${editing ? 'cursor-pointer ring-2 ring-blue-500/60 ring-offset-2 ring-offset-[#0A0A0F]' : ''}`}>
                  {displayAvatar
                    ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center ${avatarBg}`}>
                        <span className="text-white text-2xl font-bold">{initials}</span>
                      </div>
                  }
                </div>
                {editing && (
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 border-2 border-[#0A0A0F] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) } }} />
              </div>
              <div>
                {editing ? (
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-white text-lg font-bold outline-none mb-1 w-full focus:border-blue-500" />
                ) : (
                  <h1 className="text-white text-xl font-bold">{profile?.display_name || profile?.username}</h1>
                )}
                <p className="text-white/40 text-sm">@{profile?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/settings')}
                className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
                <SettingsIcon />
              </button>
              {editing && (
                <button onClick={() => { setEditing(false); setDisplayName(profile?.display_name||''); setBio(profile?.bio||''); setLocation(profile?.location||''); setAvatarFile(null); setAvatarPreview(null); setSaveMsg('') }}
                  className="border border-white/10 text-white/50 text-sm px-4 py-2 rounded-xl hover:bg-white/[0.04]">
                  Cancel
                </button>
              )}
              <button onClick={() => editing ? handleSave() : setEditing(true)}
                className="text-white text-sm px-4 py-2 rounded-xl" style={{ background:'#0038FF' }}>
                {saving ? 'Saving...' : editing ? 'Save Profile' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {saveMsg && (
            <p className={`text-[12px] mb-3 ${saveMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</p>
          )}

          {editing ? (
            <div className="space-y-3 mb-4">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
                placeholder="Write a short bio..."
                className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none resize-none focus:border-blue-500" />
              <input value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (e.g. Lagos, Nigeria)"
                className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-blue-500" />
            </div>
          ) : (
            <p className="text-white/50 text-sm mb-6">{profile?.bio || 'No bio yet.'}</p>
          )}

          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label:'Entries',    value: entries.length },
              { label:'Tracked by', value: trackerCount },
              { label:'Tracking',   value: trackingCount },
              { label:'Strength',   value: strength },
            ].map((s) => (
              <div key={s.label} className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold" style={{ color:'#6B8AFF' }}>{s.value}</p>
                <p className="text-white/40 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="border border-white/[0.08] rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/55 text-[12px]">Profile Strength</span>
              <span className="text-[12px] font-semibold">
                <span className="text-white">{strength}pts</span>{' '}
                <span style={{ color:'#6B8AFF' }}>{strengthTier}</span>
              </span>
            </div>
            <div className="w-full h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width:`${strengthPct}%`, background:'#0038FF' }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mb-6">
          <div className="flex gap-8">
            {TABS.map((t) => {
              const active = activeTab === t.key
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="pb-3 text-[14px] font-medium transition-colors relative"
                  style={{ color: active ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                  {t.label}
                  {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background:'#0038FF' }} />}
                </button>
              )
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background:'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Secured */}
        {activeTab === 'secured' && (
          <div className="space-y-4">
            {entries.length === 0
              ? <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-10 text-center">
                  <p className="text-white/30 text-sm">No secured entries yet.</p>
                </div>
              : entries.map((entry) => (
                <div key={entry.id}
                  className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-5 cursor-pointer hover:border-white/[0.14] transition-colors"
                  onClick={() => setReceipt(entry)}>
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <Image src={platformIcon(entry.platform)} alt={entry.platform} width={22} height={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm mb-1">{entry.title}</p>
                      {entry.description && <p className="text-white/40 text-xs mb-2 line-clamp-2">{entry.description}</p>}
                      {entry.screenshot_url && (
                        <img src={entry.screenshot_url} alt="screenshot" className="w-full rounded-xl mb-3 max-h-40 object-cover" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.blockchain_ref ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border"
                              style={{ background:'rgba(0,56,255,0.12)', borderColor:'rgba(0,56,255,0.30)', color:'#6B8AFF' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                              Onchain
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                              style={{ background:'rgba(0,56,255,0.12)', borderColor:'rgba(0,56,255,0.30)', color:'#6B8AFF' }}>
                              Secured
                            </span>
                          )}
                          <span className="text-white/30 text-xs">{shortDate(entry.secured_at)}</span>
                        </div>
                        <span className="text-white/30 text-xs cursor-pointer hover:text-white transition-colors">identify →</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* About */}
        {activeTab === 'about' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden">
              {[
                { icon:'👤', label:'CREATOR TYPE', value: profile?.creator_type || 'Indie Maker · Newsletter writer · Build-in-public' },
                { icon:'🛡', label:'MEMBER SINCE',  value: `${memberSince} — Early User` },
                { icon:'📍', label:'LOCATION',      value: profile?.location || '—' },
                { icon:'📺', label:'PLATFORMS',     value: usedPlatforms || '—' },
              ].map((row, i, arr) => (
                <div key={row.label}
                  className={`flex items-start gap-3 px-5 py-4 ${i < arr.length-1 ? 'border-b border-white/[0.06]' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-[14px]">{row.icon}</div>
                  <div>
                    <p className="text-white/40 text-[10px] font-semibold tracking-[0.10em] mb-0.5">{row.label}</p>
                    <p className="text-white/75 text-[13px]">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-[11px] font-bold tracking-[0.12em] mb-2" style={{ color:'#0038FF' }}>CANDOXA RECORD</p>
              <p className="text-white/55 text-[13px] leading-relaxed">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} permanently secured. Identity timestamped and indelible. All records independently verifiable.
              </p>
            </div>
          </div>
        )}

        {/* Badge */}
        {activeTab === 'badge' && (
          <div className="flex flex-col gap-4">
            <p className="text-white/45 text-[13px]">Badges are earned automatically as you grow your profile strength and community.</p>
            <div className="grid grid-cols-3 gap-4">
              {BADGES.map((badge) => {
                const earned = badge.req(profile)
                return (
                  <div key={badge.id} className="border rounded-xl p-5 flex flex-col items-center gap-2.5 text-center"
                    style={earned ? { borderColor:'rgba(0,56,255,0.40)', background:'rgba(0,56,255,0.08)' } : { borderColor:'rgba(255,255,255,0.08)', background:'#0A0A0F' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px]"
                      style={earned ? { background:'#0038FF' } : { background:'rgba(255,255,255,0.06)' }}>
                      {badge.icon}
                    </div>
                    <div>
                      <p className="text-white text-[13px] font-semibold">{badge.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: earned ? '#6B8AFF' : 'rgba(255,255,255,0.35)' }}>{badge.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {receipt && <ReceiptSheet entry={receipt} profile={profile} onClose={() => setReceipt(null)} />}
    </>
  )
}