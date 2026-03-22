// components/discover/DiscoverPage.tsx — Discover secured records across the network
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const filters = ['All', 'Platform', 'All Content', 'Most Secured', 'Recent Activity']

export default function DiscoverPage({ user }: { user: any }) {
  const [creators, setCreators] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [filter, setFilter] = useState('All')
  const [stats, setStats] = useState({ entries: 0, creators: 0, today: 0 })
  const [myProfile, setMyProfile] = useState<any>(null)
  const [tracking, setTracking] = useState<string[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      const { data: me } = await supabase.from('users').select('*').eq('email', user.email).single()
      setMyProfile(me)

      // Get all public users
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('is_public', true)
        .neq('email', user.email)
        .order('profile_strength', { ascending: false })
        .limit(10)
      setCreators(users || [])

      // Get recent public entries
      const { data: recentEntries } = await supabase
        .from('entries')
        .select('*, users(username, display_name, avatar_url)')
        .eq('visibility', 'public')
        .eq('status', 'secured')
        .order('secured_at', { ascending: false })
        .limit(20)
      setEntries(recentEntries || [])

      // Stats
      const { count: entryCount } = await supabase.from('entries').select('*', { count: 'exact', head: true })
      const { count: creatorCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { count: todayCount } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .gte('secured_at', today.toISOString())
      setStats({ entries: entryCount || 0, creators: creatorCount || 0, today: todayCount || 0 })

      // My tracking list
      if (me) {
        const { data: trackData } = await supabase
          .from('trackers')
          .select('tracked_id')
          .eq('tracker_id', me.id)
        setTracking((trackData || []).map((t: any) => t.tracked_id))
      }
    }
    fetchAll()
  }, [user])

  const handleTrack = async (creatorId: string) => {
    if (!myProfile) return
    if (tracking.includes(creatorId)) {
      await supabase.from('trackers').delete()
        .eq('tracker_id', myProfile.id)
        .eq('tracked_id', creatorId)
      setTracking(tracking.filter((id) => id !== creatorId))
    } else {
      await supabase.from('trackers').insert({ tracker_id: myProfile.id, tracked_id: creatorId })
      setTracking([...tracking, creatorId])
    }
  }

  return (
    <div className="flex gap-6">
      {/* Main */}
      <div className="flex-1">
        <h1 className="text-white text-2xl font-bold mb-1">Discover Secured Records</h1>
        <p className="text-white/40 text-sm mb-6">Find and track permanent identity records across the network.</p>

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'border border-white/10 text-white/50 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Featured creators */}
        {creators.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-wider">Featured Creators</h2>
            </div>
            <div className="space-y-3">
              {creators.slice(0, 3).map((creator) => (
                <div key={creator.id} className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {creator.display_name?.[0]?.toUpperCase() || creator.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">@{creator.username}</p>
                      <p className="text-white/40 text-xs">@{creator.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTrack(creator.id)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      tracking.includes(creator.id)
                        ? 'bg-white/10 text-white/60 border border-white/20'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {tracking.includes(creator.id) ? '✓ Tracking' : 'Track'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New entries */}
        <div>
          <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4">New Entries</h2>
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-xs font-bold">
                    {entry.users?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{entry.title}</p>
                    <p className="text-white/40 text-xs">{entry.description}</p>
                  </div>
                </div>
                {entry.screenshot_url && (
                  <img src={entry.screenshot_url} alt="" className="w-full rounded-xl mb-3 max-h-48 object-cover" />
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">Secured</span>
                    <span className="text-white/30 text-xs">{new Date(entry.secured_at).toLocaleDateString()}</span>
                  </div>
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-white/30 text-xs hover:text-white transition-colors">
                    identify →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-64 shrink-0 space-y-4">
        {/* Stats */}
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-white font-bold text-lg">{stats.entries.toLocaleString()}</p>
              <p className="text-white/40 text-xs">ENTRIES</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{stats.creators}</p>
              <p className="text-white/40 text-xs">CREATORS</p>
            </div>
            <div>
              <p className="text-blue-400 font-bold text-lg">+{stats.today}</p>
              <p className="text-white/40 text-xs">TODAY</p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5">
          <p className="text-white/50 text-xs font-medium mb-3 uppercase tracking-wider">Leaderboard</p>
          <div className="space-y-3">
            {creators.slice(0, 4).map((creator) => (
              <div key={creator.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-xs">
                    {creator.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-white/70 text-xs">{creator.username}</span>
                </div>
                <button
                  onClick={() => handleTrack(creator.id)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    tracking.includes(creator.id)
                      ? 'border-blue-500/50 text-blue-400'
                      : 'border-white/20 text-white/40 hover:text-white'
                  }`}
                >
                  {tracking.includes(creator.id) ? '✓ Tracking' : 'Track'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}