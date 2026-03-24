// components/dashboard/DashboardHome.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import AddEntryModal from './AddEntryModal'
import TrackingTab from './TrackingTab'

export default function DashboardHome({ user }: { user: any }) {
  const router = useRouter()
  const [entries,      setEntries]      = useState<any[]>([])
  const [profile,      setProfile]      = useState<any>(null)
  const [trending,     setTrending]     = useState<any[]>([])
  const [activeTab,    setActiveTab]    = useState<'secured' | 'tracking'>('secured')
  const [showAddEntry, setShowAddEntry] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from('users').select('*').eq('email', user.email).single()
      setProfile(profileData)

      if (profileData) {
        const { data: entriesData } = await supabase
          .from('entries').select('*').eq('user_id', profileData.id)
          .order('secured_at', { ascending: false })
        setEntries(entriesData || [])

        const { data: trendingData } = await supabase
          .from('users')
          .select('id, username, avatar_url, profile_strength')
          .neq('id', profileData.id)
          .order('profile_strength', { ascending: false })
          .limit(4)
        setTrending(trendingData || [])
      }
    }
    fetchData()
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const displayName  = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'Creator'
  const strengthPct  = Math.min(((profile?.profile_strength || 0) / 500) * 100, 100)
  const strengthTier = (pts: number) => {
    if (pts === 0)   return 'Beginner'
    if (pts < 100)   return 'Rising'
    if (pts < 250)   return 'Verified'
    if (pts < 400)   return 'Pro'
    return 'Elite'
  }

  const platformIcon = (platform: string) => {
    const p = (platform || '').toLowerCase()
    const map: Record<string, string> = {
      youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
      twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
    }
    return map[p] ?? '/icons/others.png'
  }

  const refetchEntries = () => {
    if (!profile?.id) return
    supabase.from('entries').select('*').eq('user_id', profile.id)
      .order('secured_at', { ascending: false })
      .then(({ data }) => setEntries(data || []))
  }

  return (
    <div className="flex gap-5">

      {/* ── Main feed column ── */}
      <div className="flex-1 min-w-0">

        {/* ════════════════════════════════════
            DESKTOP header
        ════════════════════════════════════ */}
        <div className="hidden md:flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-[22px] font-bold tracking-tight">
              {greeting()}, {displayName} 👋
            </h1>
            <p className="text-white/40 text-[14px] mt-1">
              Here's what's happening with your identity today.
            </p>
          </div>
          <button
            onClick={() => setShowAddEntry(true)}
            style={{
              background: '#0038FF',
              width: '167px',
              height: '52px',
              borderRadius: '300px',
              gap: '8px',
            }}
            className="flex items-center justify-center text-white text-[14px] font-semibold flex-shrink-0 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            + Add Entry
          </button>
        </div>

        {/* ════════════════════════════════════
            MOBILE header  — avatar + welcome
        ════════════════════════════════════ */}
        <div className="md:hidden flex items-center gap-3 mb-4 px-1">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-white/10">
            {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
              <img
                src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-700">
                <span className="text-white text-[15px] font-bold">
                  {displayName[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {/* Text */}
          <div>
            <p className="text-white text-[15px] font-bold leading-tight">
              Welcome back, @{profile?.username || displayName}
            </p>
            <p className="text-white/40 text-[12px] mt-0.5">
              Your permanent identity is ready.
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════
            MOBILE Profile Strength card
        ════════════════════════════════════ */}
        <div
          className="md:hidden mb-5 border border-white/[0.10] bg-[#0A0A0F]"
          style={{ borderRadius: '12px', padding: '14px 16px' }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-white/55 text-[12px] font-medium">Profile Strength</span>
            <span className="text-white text-[12px] font-semibold">
              {profile?.profile_strength || 0}{' '}
              <span style={{ color: '#6B8AFF' }}>
                {strengthTier(profile?.profile_strength || 0)}
              </span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-[4px] bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${strengthPct}%`, background: '#0038FF' }}
            />
          </div>
        </div>

        {/* ════════════════════════════════════
            TABS  (same on both)
        ════════════════════════════════════ */}
        <div className="relative mb-6">
          <div className="flex gap-8">
            {(['secured', 'tracking'] as const).map((tab) => {
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="pb-3 text-[14px] font-medium transition-colors relative"
                  style={{ color: '#C9D1FF' }}
                >
                  {tab === 'secured' ? 'All Secured' : 'Tracking'}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                      style={{ background: '#0038FF' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <div
            className="absolute bottom-0 left-0 h-[1px]"
            style={{ width: '480px', background: '#FFFFFF', opacity: 0.12 }}
          />
        </div>

        {/* ════════════════════════════════════
            ALL SECURED tab
        ════════════════════════════════════ */}
        {activeTab === 'secured' && (
          <>
            {entries.length === 0 ? (

              /* ── Mobile empty state ── */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                {/* Doc icon */}
                <div className="mb-5 opacity-25">
                  <svg width="52" height="60" viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="50" height="58" rx="7" stroke="white" strokeWidth="2"/>
                    <path d="M13 22h26M13 30h26M13 38h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M33 1v14h14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <h3 className="text-white text-[17px] font-bold mb-2">
                  No secured entries yet
                </h3>
                <p className="text-white/40 text-[13px] leading-relaxed max-w-[260px] mb-7">
                  Start building your permanent record. Secure your first achievement or creation to make it indelible and discoverable
                </p>

                <button
                  onClick={() => setShowAddEntry(true)}
                  style={{
                    background: '#0038FF',
                    borderRadius: '300px',
                    padding: '14px 32px',
                  }}
                  className="text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
                >
                  Secure Your First Entry
                </button>
              </div>

            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-white/[0.10] bg-[#0A0A0F]"
                    style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center">
                        <Image src={platformIcon(entry.platform)} alt={entry.platform} width={22} height={22} className="rounded-[4px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-[14px] leading-tight">{entry.title}</p>
                        {entry.description && (
                          <p className="text-white/40 text-[12px] mt-1 leading-relaxed line-clamp-2">{entry.description}</p>
                        )}
                      </div>
                    </div>

                    {entry.screenshot_url && (
                      <img
                        src={entry.screenshot_url}
                        alt="screenshot"
                        style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', maxHeight: '200px' }}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[11px] font-semibold px-3 py-1 border"
                          style={{
                            borderRadius: '300px',
                            background: 'rgba(0,56,255,0.12)',
                            borderColor: 'rgba(0,56,255,0.30)',
                            color: '#6B8AFF',
                          }}
                        >
                          Secured
                        </span>
                        <span className="text-white/30 text-[12px]">
                          {new Date(entry.secured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <button
                        onClick={() => router.push(`/${profile?.username}`)}
                        className="text-white/40 text-[13px] hover:text-white transition-colors flex items-center gap-1"
                      >
                        identify →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TRACKING tab
        ════════════════════════════════════ */}
        {activeTab === 'tracking' && (
          <TrackingTab profile={profile} />
        )}
      </div>

      {/* ════════════════════════════════════
          DESKTOP right sidebar
          (hidden on mobile)
      ════════════════════════════════════ */}
      {activeTab === 'secured' && (
        <div className="hidden md:flex flex-shrink-0 flex-col gap-4" style={{ width: '320px' }}>

          {/* Profile Strength */}
          <div
            className="border border-white/[0.10] bg-[#0A0A0F] flex flex-col"
            style={{ borderRadius: '16px', padding: '20px', gap: '16px', height: '223px' }}
          >
            <p className="text-white/55 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Your Profile Strength
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-white text-[38px] font-bold leading-none">{profile?.profile_strength || 0}</p>
              <p className="text-[13px] font-medium" style={{ color: '#6B8AFF' }}>Out of 500 possible points</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${strengthPct}%`, background: '#0038FF' }}
                />
              </div>
              <p className="text-white/25 text-[11px]">Secure more entries to grow</p>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="w-full border border-white/[0.10] text-white/50 text-[12px] font-medium py-2 rounded-xl hover:border-white/20 hover:text-white/70 transition-colors mt-auto"
            >
              View Profile
            </button>
          </div>

          {/* Trending Builders */}
          <div
            className="border border-white/[0.10] bg-[#0A0A0F] flex flex-col"
            style={{ borderRadius: '16px', padding: '15px', gap: '16px', height: '284px' }}
          >
            <p className="text-white/55 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Trending Builders
            </p>
            {trending.length === 0 ? (
              <p className="text-white/20 text-[12px]">Loading trending creators...</p>
            ) : (
              <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                {trending.map((u) => {
                  const initials = (u.username || '?')[0].toUpperCase()
                  const palette  = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
                  const color    = palette[initials.charCodeAt(0) % palette.length]
                  return (
                    <div key={u.id} className="flex items-center gap-2.5">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        : <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                            <span className="text-white text-[12px] font-bold">{initials}</span>
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white/85 text-[13px] font-medium truncate">{u.username}</p>
                        <p className="text-white/35 text-[11px]">{u.profile_strength || 0}pts</p>
                      </div>
                      <button
                        onClick={() => router.push(`/${u.username}`)}
                        className="flex items-center gap-1 text-white/35 text-[11px] hover:text-white/65 transition-colors flex-shrink-0"
                      >
                        + View Profile
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Platform Update */}
          <div
            className="border border-white/[0.10] bg-[#0A0A0F] flex flex-col"
            style={{ borderRadius: '12px', padding: '10px', gap: '7px', height: '133px' }}
          >
            <PlatformUpdateWidget />
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntry && (
        <AddEntryModal
          user={user}
          profile={profile}
          onClose={() => setShowAddEntry(false)}
          onSuccess={() => {
            setShowAddEntry(false)
            refetchEntries()
          }}
        />
      )}
    </div>
  )
}

// ─── Platform Update ─────────────────────────────────────────────────────────
function PlatformUpdateWidget() {
  const [announcement, setAnnouncement] = useState<any>(null)

  useEffect(() => {
    supabase.from('announcements').select('title, body, created_at')
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => setAnnouncement(data))
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ gap: '7px' }}>
      <p className="text-[13px] font-bold" style={{ color: '#0038FF' }}>Platform Update</p>
      {!announcement ? (
        <p className="text-white/20 text-[11px]">No updates yet.</p>
      ) : (
        <>
          <p className="text-white font-semibold text-[13px] leading-tight">{announcement.title}</p>
          <p className="text-white/35 text-[11px] leading-relaxed line-clamp-2 flex-1">{announcement.body}</p>
          <button className="flex items-center gap-1 text-white/40 text-[11px] hover:text-white/70 transition-colors self-start">
            View Details ↗
          </button>
        </>
      )}
    </div>
  )
}