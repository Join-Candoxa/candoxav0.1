// components/dashboard/TrackingTab.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface TrackedCreator {
  id: string
  username: string
  avatar_url: string | null
  entry_count: number
  new_count: number
}

interface TrackingEntry {
  id: string
  title: string
  description: string | null
  platform: string
  screenshot_url: string | null
  secured_at: string
  url: string | null
  creator: {
    id: string
    username: string
    avatar_url: string | null
  }
}

interface ActivityItem {
  id: string
  username: string
  avatar_url: string | null
  platform: string
  secured_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?')[0].toUpperCase()
  const palette  = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color    = palette[initials.charCodeAt(0) % palette.length]
  const sz = size === 'sm' ? 'w-8 h-8 text-[12px]' : size === 'lg' ? 'w-12 h-12 text-[16px]' : 'w-10 h-10 text-[13px]'
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="text-white font-bold">{initials}</span>
    </div>
  )
}

function platformIcon(platform: string) {
  const p = (platform || '').toLowerCase()
  const map: Record<string, string> = {
    youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
    twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
  }
  return map[p] ?? '/icons/others.png'
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TrackingTab({ profile }: { profile: any }) {
  const router = useRouter()
  const [tracked,    setTracked]    = useState<TrackedCreator[]>([])
  const [entries,    setEntries]    = useState<TrackingEntry[]>([])
  const [activity,   setActivity]   = useState<ActivityItem[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    fetchAll()
  }, [profile?.id])

  const fetchAll = async () => {
    setLoading(true)

    // Get who this user is tracking
    const { data: trackingRows } = await supabase
      .from('tracking')
      .select('tracked_id')
      .eq('tracker_id', profile.id)

    const trackedIds = (trackingRows || []).map((r: any) => r.tracked_id)

    if (trackedIds.length === 0) {
      setTracked([]); setEntries([]); setActivity([]); setLoading(false); return
    }

    // Get tracked users info + their entry counts
    const { data: trackedUsers } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', trackedIds)

    // Entry counts per tracked user
    const { data: allEntries } = await supabase
      .from('entries')
      .select('id, user_id, title, description, platform, screenshot_url, secured_at, url, users(id, username, avatar_url)')
      .in('user_id', trackedIds)
      .order('secured_at', { ascending: false })
      .limit(50)

    const countMap: Record<string, number> = {}
    ;(allEntries || []).forEach((e: any) => {
      countMap[e.user_id] = (countMap[e.user_id] || 0) + 1
    })

    // Last visited — 7 days ago threshold for "new"
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const newMap: Record<string, number> = {}
    ;(allEntries || []).forEach((e: any) => {
      if (e.secured_at > weekAgo) newMap[e.user_id] = (newMap[e.user_id] || 0) + 1
    })

    setTracked(
      (trackedUsers || []).map((u: any) => ({
        id:          u.id,
        username:    u.username || '—',
        avatar_url:  u.avatar_url,
        entry_count: countMap[u.id] || 0,
        new_count:   newMap[u.id]   || 0,
      }))
    )

    setEntries(
      (allEntries || []).map((e: any) => ({
        id:             e.id,
        title:          e.title || 'Untitled',
        description:    e.description || null,
        platform:       e.platform || 'other',
        screenshot_url: e.screenshot_url || null,
        secured_at:     e.secured_at,
        url:            e.url || null,
        creator: {
          id:         e.users?.id,
          username:   e.users?.username || '—',
          avatar_url: e.users?.avatar_url || null,
        },
      }))
    )

    // Recent activity — last 8 entries from tracked users
    setActivity(
      (allEntries || []).slice(0, 8).map((e: any) => ({
        id:         e.id,
        username:   e.users?.username || '—',
        avatar_url: e.users?.avatar_url || null,
        platform:   e.platform || 'other',
        secured_at: e.secured_at,
      }))
    )

    setLoading(false)
  }

  const handleUntrack = async (trackedId: string) => {
    await supabase.from('tracking').delete()
      .eq('tracker_id', profile.id).eq('tracked_id', trackedId)
    fetchAll()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  return (
    <div className="flex gap-5">

      {/* ── Left feed ── */}
      <div className="flex-1 min-w-0">

        {/* Tracked creator avatars row */}
        {tracked.length > 0 && (
          <div className="flex items-end gap-5 mb-7 flex-wrap">
            {tracked.map((creator) => (
              <button
                key={creator.id}
                onClick={() => router.push(`/${creator.username}`)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-[72px] h-[72px] rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all">
                  <Avatar src={creator.avatar_url} name={creator.username} size="lg" />
                </div>
                <span className="text-white/55 text-[11px] group-hover:text-white/80 transition-colors">
                  @{creator.username}
                </span>
              </button>
            ))}
            {/* + button */}
            <button
              onClick={() => router.push('/discover')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-[72px] h-[72px] rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors">
                <span className="text-white/50 text-[24px] font-light group-hover:text-white/80 transition-colors">+</span>
              </div>
              <span className="text-white/30 text-[11px]">Find more</span>
            </button>
          </div>
        )}

        {/* New Entries heading + rule */}
        <div className="flex items-center gap-4 mb-5">
          <h2 className="text-white font-semibold text-[16px] flex-shrink-0">New Entries</h2>
          <div className="flex-1 h-[1px] bg-white/[0.08]" />
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="border border-white/[0.08] rounded-2xl p-12 text-center" style={{ borderRadius: '12px' }}>
            <p className="text-white/25 text-[13px] mb-3">No entries from creators you track yet.</p>
            <button
              onClick={() => router.push('/discover')}
              className="text-[13px] font-semibold px-5 py-2.5 rounded-full text-white"
              style={{ background: '#0038FF' }}
            >
              Find Creators
            </button>
          </div>
        )}

        {/* Entry cards */}
        <div className="space-y-5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-white/[0.10] bg-[#0A0A0F]"
              style={{ borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Top — creator avatar + name + Tracking pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={entry.creator.avatar_url} name={entry.creator.username} size="md" />
                  <div>
                    <p className="text-white font-semibold text-[13px]">@{entry.creator.username}</p>
                    <p className="text-white/35 text-[11px]">@{entry.creator.username}</p>
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}
                >
                  Tracking
                </span>
              </div>

              {/* Platform icon + title + description */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center mt-0.5">
                  <Image src={platformIcon(entry.platform)} alt={entry.platform} width={20} height={20} className="rounded-[3px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-[14px] leading-tight">{entry.title}</p>
                  {entry.description && (
                    <p className="text-white/35 text-[12px] mt-1 leading-relaxed line-clamp-2">{entry.description}</p>
                  )}
                </div>
              </div>

              {/* Screenshot */}
              {entry.screenshot_url && (
                <img
                  src={entry.screenshot_url}
                  alt="screenshot"
                  style={{ width: '100%', height: '264px', borderRadius: '12px', objectFit: 'cover' }}
                />
              )}

              {/* Bottom bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                    style={{ background: 'rgba(0,56,255,0.12)', borderColor: 'rgba(0,56,255,0.30)', color: '#6B8AFF', borderRadius: '300px' }}
                  >
                    Secured
                  </span>
                  <span className="text-white/25 text-[12px]">{shortDate(entry.secured_at)}</span>
                </div>
                <button
                  onClick={() => router.push(`/${entry.creator.username}`)}
                  className="text-white/40 text-[13px] hover:text-white transition-colors flex items-center gap-1"
                >
                  identify →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="flex-shrink-0 flex flex-col gap-4" style={{ width: '320px' }}>

        {/* Creators You Track */}
        <div
          className="border border-white/[0.10] bg-[#0A0A0F] flex flex-col"
          style={{ borderRadius: '16px', padding: '15px', gap: '12px' }}
        >
          <p className="text-white/55 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Creators You Track
          </p>

          {tracked.length === 0 ? (
            <p className="text-white/20 text-[12px]">You're not tracking anyone yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {tracked.map((creator) => (
                <div key={creator.id} className="flex items-center gap-2.5">
                  <Avatar src={creator.avatar_url} name={creator.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[12px] font-medium truncate">{creator.username}</p>
                    <p className="text-white/30 text-[11px]">
                      {creator.entry_count} {creator.entry_count === 1 ? 'entry' : 'entries'}
                      {creator.new_count > 0 && (
                        <span className="text-blue-400 ml-1">· {creator.new_count} new</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUntrack(creator.id)}
                    className="flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-lg border border-white/[0.10] text-white/35 hover:text-white/60 hover:border-white/20 transition-colors"
                  >
                    Untrack
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* + Find Creators */}
          <button
            onClick={() => router.push('/discover')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-white/[0.10] rounded-xl text-white/45 text-[12px] font-medium hover:text-white/70 hover:border-white/20 transition-colors mt-1"
          >
            + Find Creators
          </button>
        </div>

        {/* Recent Activity */}
        <div
          className="border border-white/[0.10] bg-[#0A0A0F] flex flex-col"
          style={{ borderRadius: '16px', padding: '15px', gap: '12px' }}
        >
          <p className="text-white/55 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Recent Activity
          </p>

          {activity.length === 0 ? (
            <p className="text-white/20 text-[12px]">No recent activity.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <Avatar src={item.avatar_url} name={item.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-[12px] leading-tight">
                      <span className="font-medium">@{item.username}</span>
                      <span className="text-white/40"> secured a {item.platform} entry</span>
                    </p>
                    <p className="text-white/25 text-[10px] mt-0.5">
                      {timeAgo(item.secured_at)} · {new Date(item.secured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip */}
        <div
          className="border border-white/[0.10] bg-[#0A0A0F] flex flex-col"
          style={{ borderRadius: '12px', padding: '12px', gap: '6px' }}
        >
          <p className="text-[13px] font-bold" style={{ color: '#0038FF' }}>Tip</p>
          <p className="text-white font-semibold text-[13px] leading-tight">Track top builders</p>
          <p className="text-white/35 text-[11px] leading-relaxed">
            Tracking adds their new secured entries to this feed as they publish — with no algorithm.
          </p>
          <button
            onClick={() => router.push('/secured')}
            className="flex items-center gap-1 text-white/40 text-[11px] hover:text-white/65 transition-colors self-start mt-1"
          >
            Browse All Secured ↗
          </button>
        </div>
      </div>
    </div>
  )
}