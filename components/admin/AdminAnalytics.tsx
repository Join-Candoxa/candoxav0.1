// components/admin/AdminAnalytics.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

// ─── Sparkline (mini line chart) ─────────────────────────────────────────────
function Sparkline({ color = '#3b82f6' }: { color?: string }) {
  const pts = [18, 32, 22, 48, 28, 55, 42, 60, 38, 65, 50, 70]
  const W = 120, H = 50
  const max = Math.max(...pts), min = Math.min(...pts)
  const range = max - min || 1
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - ((p - min) / range) * (H - 8) - 4
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Bar chart (28-day daily entries) ────────────────────────────────────────
function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[2px] h-full w-full">
      {data.map((v, i) => {
        const heightPct = Math.max((v / max) * 100, v > 0 ? 4 : 0)
        const opacity   = 0.35 + (v / max) * 0.65
        const isLast    = i === data.length - 1
        return (
          <div
            key={i}
            className="flex-1 rounded-[2px] transition-all duration-500"
            style={{
              height: `${heightPct}%`,
              background: isLast
                ? '#3b82f6'
                : `rgba(59,130,246,${opacity.toFixed(2)})`,
              minHeight: v > 0 ? '3px' : '0',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'youtube',   label: 'Youtube',      icon: '/icons/youtube.png' },
  { key: 'instagram', label: 'Instagram',    icon: '/icons/instagram.png' },
  { key: 'twitter',   label: 'X (Formerly)', icon: '/icons/x.png' },
  { key: 'linkedin',  label: 'Linkedin',     icon: '/icons/linkedin.png' },
  { key: 'others',    label: 'Others',       icon: '/icons/others.png' },
]

const PLATFORM_ICON_MAP: Record<string, string> = {
  youtube:   '/icons/youtube.png',
  instagram: '/icons/instagram.png',
  twitter:   '/icons/x.png',
  x:         '/icons/x.png',
  linkedin:  '/icons/linkedin.png',
}

function getPlatformIcon(platform: string) {
  return PLATFORM_ICON_MAP[(platform || '').toLowerCase()] ?? '/icons/others.png'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${d}d ${h}h ${m}m ${s}s`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [uptime, setUptime] = useState('—')
  const [platformStartMs, setPlatformStartMs] = useState<number | null>(null)

  const [stats, setStats] = useState({
    activeToday:   0,
    totalUsers:    0,
    entriesToday:  0,
    totalEntries:  0,
    usersChange:   0,
    entriesChange: 0,
    activeChange:  0,
  })

  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({})
  const [liveActivity,   setLiveActivity]   = useState<any[]>([])
  const [dailyEntries,   setDailyEntries]   = useState<number[]>(Array(28).fill(0))
  const [growthTrend,    setGrowthTrend]    = useState({
    totalPairs: 0, avgPerUser: 0, newThisWeek: 0, mostTracked: '—',
    totalReferrals: 0, earlyBadge: 0, conversionRate: 0,
  })
  const [mostTracked, setMostTracked] = useState<{ username: string; count: number }[]>([])

  // ── Uptime ticker — derived from earliest user created_at in DB ────────────
  useEffect(() => {
    if (platformStartMs === null) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - platformStartMs) / 1000)
      setUptime(formatUptime(elapsed))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [platformStartMs])

  // ── Fetch all analytics data ───────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const now      = new Date()
      const todayMid = new Date(now); todayMid.setHours(0, 0, 0, 0)
      const yesterMid = new Date(todayMid); yesterMid.setDate(yesterMid.getDate() - 1)
      const weekAgo   = new Date(todayMid); weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo  = new Date(todayMid); monthAgo.setDate(monthAgo.getDate() - 28)

      const todayISO  = todayMid.toISOString()
      const yesterISO = yesterMid.toISOString()
      const weekISO   = weekAgo.toISOString()
      const monthISO  = monthAgo.toISOString()

      // Platform start — earliest user created_at
      const { data: firstUser } = await supabase
        .from('users')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (firstUser?.created_at) {
        setPlatformStartMs(new Date(firstUser.created_at).getTime())
      }

      // Counts
      const [
        { count: totalUsers },
        { count: usersThisWeek },
        { count: entriesToday },
        { count: totalEntries },
        { count: entriesThisWeek },
        { count: activeYesterday },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekISO),
        supabase.from('entries').select('*', { count: 'exact', head: true }).gte('secured_at', todayISO),
        supabase.from('entries').select('*', { count: 'exact', head: true }),
        supabase.from('entries').select('*', { count: 'exact', head: true }).gte('secured_at', weekISO),
        supabase.from('entries').select('*', { count: 'exact', head: true }).gte('secured_at', yesterISO).lt('secured_at', todayISO),
      ])

      setStats({
        activeToday:   entriesToday    || 0,
        totalUsers:    totalUsers      || 0,
        entriesToday:  entriesToday    || 0,
        totalEntries:  totalEntries    || 0,
        usersChange:   usersThisWeek   || 0,
        entriesChange: entriesThisWeek || 0,
        activeChange:  (entriesToday || 0) - (activeYesterday || 0),
      })

      // Platform breakdown
      const { data: platformRows } = await supabase.from('entries').select('platform')
      const counts: Record<string, number> = {}
      platformRows?.forEach((r: any) => {
        const k = (r.platform || 'others').toLowerCase()
        counts[k] = (counts[k] || 0) + 1
      })
      setPlatformCounts(counts)

      // Live activity feed — 8 most recent entries
      const { data: recent } = await supabase
        .from('entries')
        .select('id, platform, secured_at, users(username, avatar_url)')
        .order('secured_at', { ascending: false })
        .limit(8)
      setLiveActivity(recent || [])

      // Daily entries — 28 buckets
      const { data: dailyRows } = await supabase
        .from('entries')
        .select('secured_at')
        .gte('secured_at', monthISO)
        .order('secured_at', { ascending: true })

      const buckets = Array(28).fill(0)
      const nowMs   = Date.now()
      dailyRows?.forEach((r: any) => {
        const daysAgo = Math.floor((nowMs - new Date(r.secured_at).getTime()) / 86400000)
        const idx     = 27 - daysAgo
        if (idx >= 0 && idx < 28) buckets[idx]++
      })
      setDailyEntries(buckets)

      // Most tracked users (by entry count)
      const { data: allEntries } = await supabase
        .from('entries')
        .select('user_id, users(username)')
        .limit(2000)

      const userMap: Record<string, { username: string; count: number }> = {}
      allEntries?.forEach((e: any) => {
        const uid   = e.user_id
        const uname = e.users?.username || uid
        if (!userMap[uid]) userMap[uid] = { username: uname, count: 0 }
        userMap[uid].count++
      })
      const sortedUsers = Object.values(userMap).sort((a, b) => b.count - a.count)
      setMostTracked(sortedUsers.slice(0, 3))

      const tu  = totalUsers   || 1
      const tp  = totalEntries || 0
      const avg = Math.round(tp / tu)
      const top = sortedUsers[0]?.username || '—'

      setGrowthTrend({
        totalPairs:     tp,
        avgPerUser:     avg,
        newThisWeek:    entriesThisWeek || 0,
        mostTracked:    top,
        totalReferrals: 0,
        earlyBadge:     0,
        conversionRate: 0,
      })
    }

    fetchAll()
  }, [])

  // Helper: resolve "others" bucket
  const getPlatformCount = (key: string) => {
    if (key === 'others') {
      const known = new Set(['youtube', 'instagram', 'twitter', 'x', 'linkedin'])
      return Object.entries(platformCounts)
        .filter(([k]) => !known.has(k))
        .reduce((s, [, v]) => s + v, 0)
    }
    if (key === 'twitter') return (platformCounts['twitter'] || 0) + (platformCounts['x'] || 0)
    return platformCounts[key] || 0
  }

  const totalPlatformEntries = Math.max(
    PLATFORMS.reduce((s, p) => s + getPlatformCount(p.key), 0),
    1,
  )

  return (
    <div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight leading-tight">
            Platform <span className="text-blue-400">Overview</span>
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Real-time activity, growth trends, and key platform metrics.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">
            Total Uptime:{' '}
            <span className="text-white/55 font-mono tracking-tight">{uptime}</span>
          </p>
        </div>
      </div>

      {/* ── Stat row — 5 columns ────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 mb-4">

        {/* Active Users Today */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-white/40 text-xs mb-2 leading-tight">Active Users Today</p>
          <p className="text-white text-[38px] font-bold tracking-tight leading-none">
            {stats.activeToday.toLocaleString()}
          </p>
          <p className="text-white/28 text-[11px] mt-2">
            out of <span className="text-white/55">{stats.totalUsers.toLocaleString()}</span> Total
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-green-400 text-xs font-semibold">▲ {Math.abs(stats.activeChange)}</span>
            <span className="text-white/28 text-[11px]">vs Yesterday</span>
          </div>
        </div>

        {/* Entries Secured Today */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-white/40 text-xs mb-2 leading-tight">Entries Secured Today</p>
          <p className="text-white text-[38px] font-bold tracking-tight leading-none">
            {stats.entriesToday.toLocaleString()}
          </p>
          <p className="text-white/28 text-[11px] mt-2">
            out of <span className="text-white/55">{stats.totalEntries.toLocaleString()}</span> Total
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-green-400 text-xs font-semibold">▲ {stats.entriesChange}</span>
            <span className="text-white/28 text-[11px]">this week</span>
          </div>
        </div>

        {/* Mini chart A */}
        <div className="bg-[#0d0d14] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-center">
          <div className="w-full h-[72px]">
            <Sparkline color="#3b82f6" />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-white/40 text-xs mb-2 leading-tight">Total users</p>
          <p className="text-white text-[38px] font-bold tracking-tight leading-none">
            {stats.totalUsers.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-4">
            <span className="text-green-400 text-xs font-semibold">▲ {stats.usersChange}</span>
            <span className="text-white/28 text-[11px]">this week</span>
          </div>
        </div>

        {/* Mini chart B */}
        <div className="bg-[#0d0d14] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-center">
          <div className="w-full h-[72px]">
            <Sparkline color="#6366f1" />
          </div>
        </div>
      </div>

      {/* ── Bottom section — 3 columns ──────────────────────────────────────── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 268px' }}>

        {/* LEFT — Entries by Platform + Daily chart */}
        <div className="space-y-4">

          {/* Entries by Platform */}
          <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-semibold text-[15px] mb-0.5">Entries by Platform</h3>
            <p className="text-white/30 text-[11px] mb-4">
              Distribution is ranked according to most successful entries
            </p>
            <div className="space-y-3">
              {PLATFORMS.map((p) => {
                const count = getPlatformCount(p.key)
                const pct   = (count / totalPlatformEntries) * 100
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <Image
                      src={p.icon}
                      alt={p.label}
                      width={20}
                      height={20}
                      className="rounded-[4px] flex-shrink-0"
                    />
                    <span className="text-white/65 text-[13px] w-28 flex-shrink-0">{p.label}</span>
                    <div className="flex-1 h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white/35 text-[11px] w-20 text-right flex-shrink-0">
                      {count.toLocaleString()} Entries
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily Secured entries — 28-day bar chart */}
          <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white/55 text-[13px] font-medium mb-3">
              Daily Secured entries (28 days)
            </p>
            <div className="h-[100px]">
              <BarChart data={dailyEntries} />
            </div>
          </div>
        </div>

        {/* MIDDLE — Live Activity Feed */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-white font-semibold text-[15px] mb-4">Live Activity feed</h3>
          <div className="space-y-4">
            {liveActivity.length === 0 ? (
              <p className="text-white/25 text-sm">No recent activity.</p>
            ) : (
              liveActivity.map((entry, idx) => (
                <div key={entry.id ?? idx} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center mt-0.5">
                    <Image
                      src={getPlatformIcon(entry.platform)}
                      alt={entry.platform ?? 'platform'}
                      width={24}
                      height={24}
                      className="rounded-[3px]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[13px] font-medium truncate">
                      @{(entry as any).users?.username ?? 'user'}
                    </p>
                    <p className="text-white/30 text-[11px] truncate">
                      secured a new {entry.platform ?? 'entry'}
                    </p>
                  </div>
                  <span className="text-white/22 text-[11px] flex-shrink-0 pt-0.5">
                    {timeAgo(entry.secured_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT — Growth Trend + Referral + Most Tracked */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 space-y-5">

          {/* Growth Trend */}
          <div>
            <h3 className="text-white font-semibold text-[15px] mb-3">Growth Trend</h3>
            <div className="space-y-2.5">
              <Row label="Total tracking pairs" value={growthTrend.totalPairs.toLocaleString()} />
              <Row label="Avg. Tracked per User" value={String(growthTrend.avgPerUser)} />
              <Row
                label="New this week"
                value={String(growthTrend.newThisWeek)}
                valueClass="text-blue-400 font-semibold"
              />
              <Row label="Most Tracked" value={`@${growthTrend.mostTracked}`} />
            </div>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Referral */}
          <div>
            <h3 className="text-white font-semibold text-[13px] mb-3">Referral</h3>
            <div className="space-y-2.5">
              <Row label="Total Referrals"   value={String(growthTrend.totalReferrals)} />
              <Row
                label="Early badge earned"
                value={String(growthTrend.earlyBadge)}
                valueClass="text-blue-400 font-semibold"
              />
              <Row
                label="Conversion Rate"
                value={`${growthTrend.conversionRate}%`}
                valueClass="text-green-400 font-semibold"
              />
            </div>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Most Tracked */}
          <div>
            <h3 className="text-white font-semibold text-[13px] mb-3">Most Tracked</h3>
            <div className="space-y-2.5">
              {mostTracked.length === 0 ? (
                <p className="text-white/20 text-xs">No data yet.</p>
              ) : (
                mostTracked.map((u, i) => (
                  <Row
                    key={u.username}
                    label={`@${u.username}`}
                    value={u.count.toLocaleString()}
                    valueClass={i === 0 ? 'text-green-400 font-semibold' : 'text-white/50'}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Small helper row ─────────────────────────────────────────────────────────
function Row({
  label,
  value,
  valueClass = 'text-white/65',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/38 text-[11px] leading-tight">{label}</span>
      <span className={`text-[12px] leading-tight flex-shrink-0 ${valueClass}`}>{value}</span>
    </div>
  )
}