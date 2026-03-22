// components/growth/GrowthPage.tsx — Growth, credits, milestones
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const badges = [
  { name: 'Beginner', pts: '210', icon: '⬡', requirement: 1, type: 'entries' },
  { name: 'Builder', pts: '50pts', icon: '🔒', requirement: 5, type: 'entries' },
  { name: 'Sec. Founder', pts: '100pts', icon: '⭐', requirement: 10, type: 'entries' },
  { name: 'Early User', pts: 'Invite 5', icon: '⏰', requirement: 5, type: 'referrals' },
  { name: 'Consistent', pts: '7-day streak', icon: '📅', requirement: 7, type: 'streak' },
  { name: 'Networker', pts: 'Track 10', icon: '👤', requirement: 10, type: 'tracking' },
]

export default function GrowthPage({ user }: { user: any }) {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [entryCount, setEntryCount] = useState(0)
  const [trackerCount, setTrackerCount] = useState(0)
  const [trackingCount, setTrackingCount] = useState(0)
  const [inviteCodes, setInviteCodes] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: p } = await supabase.from('users').select('*').eq('email', user.email).single()
      setProfile(p)

      if (p) {
        const { count: ec } = await supabase.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', p.id)
        setEntryCount(ec || 0)

        const { count: tc } = await supabase.from('trackers').select('*', { count: 'exact', head: true }).eq('tracked_id', p.id)
        setTrackerCount(tc || 0)

        const { count: trc } = await supabase.from('trackers').select('*', { count: 'exact', head: true }).eq('tracker_id', p.id)
        setTrackingCount(trc || 0)

        const { data: codes } = await supabase.from('invite_codes').select('*').eq('created_by', p.id)
        setInviteCodes(codes || [])
      }
    }
    fetchData()
  }, [user])

  const dailyLimit = profile?.plan === 'pro' ? 999 : 10
  const dailyUsed = profile?.daily_secures_used || 0
  const strength = profile?.profile_strength || 0

  return (
    <div className="max-w-4xl">
      <h1 className="text-white text-2xl font-bold mb-1">Growth</h1>
      <p className="text-white/40 text-sm mb-8">Track your progress, credits, and milestones across Candoxa.</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center">⭐</div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-medium">Profile Strength</p>
          </div>
          <p className="text-white text-4xl font-bold mb-1">{strength}</p>
          <p className="text-blue-400 text-xs mb-3">Out of 500 possible points</p>
          <div className="w-full bg-white/5 rounded-full h-1.5 mb-2">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(strength / 500) * 100}%` }} />
          </div>
          <span className="bg-blue-900/30 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/20">
            {strength < 50 ? 'Just getting started' : strength < 150 ? 'Building momentum' : 'On fire 🔥'}
          </span>
        </div>

        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center">⊞</div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-medium">Total Secured</p>
          </div>
          <p className="text-white text-4xl font-bold mb-1">{entryCount}</p>
          <p className="text-blue-400 text-xs">records anchored to your identity</p>
          {entryCount === 1 && <p className="text-white/30 text-xs mt-1">First entry this week</p>}
        </div>

        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center">⊞</div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-medium">Trackers</p>
          </div>
          <p className="text-white text-4xl font-bold mb-1">{trackerCount}</p>
          <p className="text-blue-400 text-xs">People tracking your profile</p>
          <p className="text-white/30 text-xs mt-1">Secure more entries to attract trackers</p>
        </div>

        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-900/50 rounded-lg flex items-center justify-center">⊞</div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-medium">Referrals</p>
          </div>
          <p className="text-white text-4xl font-bold mb-1">0</p>
          <p className="text-blue-400 text-xs">Creators invited to Candoxa</p>
          <p className="text-white/30 text-xs mt-1">5 needed for Early user badge</p>
        </div>
      </div>

      {/* Daily credits */}
      <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6 mb-8">
        <h2 className="text-white font-bold mb-4">Daily Credits</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#3B82F6" strokeWidth="3"
                  strokeDasharray={`${(dailyUsed / dailyLimit) * 94} 94`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                {dailyUsed}/{dailyLimit}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{dailyLimit - dailyUsed} Free Secures Entries Remaining Today</p>
              <p className="text-white/40 text-xs">each entries anchors one record permanently to your identity.</p>
              <p className="text-white/30 text-xs mt-1">⏰ Resets in 23h 14m</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/secured')}
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm px-4 py-2 rounded-xl"
          >
            Secure Now
          </button>
        </div>
      </div>

      {/* Badges */}
      <h2 className="text-white font-bold mb-4">Badges & Milestones</h2>
      <div className="grid grid-cols-6 gap-3 mb-8">
        {badges.map((badge) => (
          <div key={badge.name} className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto mb-2 text-lg">
              {badge.icon}
            </div>
            <p className="text-white text-xs font-medium">{badge.name}</p>
            <p className="text-white/30 text-xs mt-0.5">{badge.pts}</p>
          </div>
        ))}
      </div>

      {/* Invite codes */}
      <h2 className="text-white font-bold mb-2">Invite Builders (Testnet Access)</h2>
      <p className="text-white/40 text-xs mb-4">Each user has 3 controlled invite codes. Successful invites require 1 secured entry per day for 3 consecutive days.</p>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((slot) => {
          const code = inviteCodes[slot]
          return (
            <div key={slot} className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/50 text-xs">Invite slot {slot + 1}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${code ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {code ? 'Pending' : 'Available'}
                </span>
              </div>
              {code ? (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-3 py-2 mb-2">
                  <p className="text-blue-300 text-xs font-mono">{code.code}</p>
                  <p className="text-white/30 text-xs">READ-ONLY</p>
                </div>
              ) : (
                <div className="bg-black/30 rounded-lg px-3 py-2 mb-2 blur-sm">
                  <p className="text-white/20 text-xs font-mono">XXXX-XXXX</p>
                </div>
              )}
              <p className="text-white/30 text-xs">This code grants controlled testnet access.</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}