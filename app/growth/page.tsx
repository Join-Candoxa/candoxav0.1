// app/growth/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

// ─── Circular progress ────────────────────────────────────────────────────────
function CircularProgress({ used, total }: { used: number; total: number }) {
  const r = 22, cx = 28, cy = 28
  const circumference = 2 * Math.PI * r
  const dash = circumference * Math.min(used / total, 1)
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0038FF" strokeWidth="4"
        strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" />
      <text x="28" y="28" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="11" fontWeight="700">{used}/{total}</text>
    </svg>
  )
}

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
      {children}
    </div>
  )
}

type SlotStatus = 'available' | 'pending' | 'validated'

interface InviteSlot {
  id: string
  slot: number
  code: string
  status: SlotStatus
  invitee_username: string | null
  days_completed: number
  validated_at: string | null
  invitee_id: string | null
}

// ─── Validation detail modal ──────────────────────────────────────────────────
function ValidationModal({ slot, onClose }: { slot: InviteSlot; onClose: () => void }) {
  const isValidated = slot.status === 'validated'
  const days = [
    { label: 'Day 1', done: slot.days_completed >= 1 },
    { label: 'Day 2', done: slot.days_completed >= 2 },
    { label: 'Day 3', done: slot.days_completed >= 3 },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0e0e14] border border-white/[0.12] rounded-2xl w-full max-w-[400px] p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-colors">✕</button>
        <h2 className="text-white font-bold text-[17px] mb-5">
          {isValidated ? 'Invite Successfully Validated' : 'Invite Progress'}
        </h2>
        <div className="space-y-3 mb-5">
          <div>
            <p className="text-white/40 text-[11px] font-medium mb-0.5">Invitee</p>
            <p className="text-white font-semibold text-[15px]">@{slot.invitee_username || '—'}</p>
          </div>
          {isValidated && slot.validated_at && (
            <>
              <div>
                <p className="text-white/40 text-[11px] font-medium mb-0.5">Validation Date</p>
                <p className="text-[14px] font-semibold" style={{ color:'#6B8AFF' }}>
                  {new Date(slot.validated_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-[11px] font-medium mb-0.5">Points Awarded</p>
                <p className="text-green-400 font-semibold text-[14px]">+10 pts</p>
              </div>
            </>
          )}
          {!isValidated && (
            <div>
              <p className="text-white/40 text-[11px] font-medium mb-0.5">Secured Entries</p>
              <p className="text-white font-semibold text-[15px]">{slot.days_completed} of 3 Required Days Completed</p>
            </div>
          )}
        </div>

        <div className="border border-white/[0.08] rounded-xl overflow-hidden mb-4">
          {days.map((d, i) => (
            <div key={d.label} className={`flex items-center justify-between px-4 py-3 ${i < days.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
              <span className="text-white/60 text-[13px]">{d.label}</span>
              {d.done
                ? <span className="text-green-400 text-[12px] font-semibold flex items-center gap-1.5">✓ Completed</span>
                : <span className="text-orange-400 text-[12px] font-semibold">Pending</span>
              }
            </div>
          ))}
        </div>

        {!isValidated && slot.days_completed < 3 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5 mb-4">
            <p className="text-orange-400 text-[11px]">Validation will expire if requirement is not completed consecutively.</p>
          </div>
        )}

        <button onClick={onClose} className="w-full py-3 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </div>
  )
}

// ─── Single invite slot card ──────────────────────────────────────────────────
function InviteSlotCard({ slot, username, onRefresh }: {
  slot: InviteSlot; username: string; onRefresh: () => void
}) {
  const [revealed,    setRevealed]    = useState(false)
  const [copied,      setCopied]      = useState<'code'|'link'|null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(slot.code)
    setCopied('code'); setTimeout(() => setCopied(null), 2000)
  }

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/onboarding?ref=${username}&code=${slot.code}`)
    setCopied('link'); setTimeout(() => setCopied(null), 2000)
  }

  const statusPill = () => {
    if (slot.status === 'validated') return <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/25">Validated</span>
    if (slot.status === 'pending')   return <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/25">Pending Validation</span>
    return <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-blue-600/25 text-blue-300 border border-blue-500/30">Available</span>
  }

  return (
    <>
      <div className={`border rounded-2xl p-4 flex flex-col gap-3 transition-colors
        ${slot.status === 'pending'   ? 'border-orange-500/20 cursor-pointer hover:border-orange-500/40' :
          slot.status === 'validated' ? 'border-green-500/20' :
          'border-white/[0.10]'}`}
        onClick={slot.status !== 'available' ? () => setShowDetails(true) : undefined}>

        <div className="flex items-center justify-between">
          <span className="text-white/70 text-[13px] font-medium">Invite slot {slot.slot}</span>
          {statusPill()}
        </div>

        {/* Available */}
        {slot.status === 'available' && (
          <>
            <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
              <span className="text-white/30 text-[13px] tracking-[0.20em] font-mono select-none">
                {revealed ? slot.code : '●●●●● ●●●●●●'}
              </span>
              {!revealed ? (
                <button onClick={(e) => { e.stopPropagation(); setRevealed(true) }}
                  className="text-white/55 text-[12px] font-medium hover:text-white transition-colors flex-shrink-0 ml-3">
                  Reveal Code
                </button>
              ) : (
                <button onClick={copyCode}
                  className="text-[#6B8AFF] text-[12px] font-medium hover:text-blue-300 transition-colors flex-shrink-0 ml-3">
                  {copied === 'code' ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <p className="text-white/30 text-[11px] leading-relaxed">
              This code grants controlled testnet access. Invitee must secure 1 link per day for 3 consecutive days to validate.
            </p>
            {revealed && (
              <div className="flex gap-2">
                <button onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/[0.10] text-white/50 text-[12px] font-medium hover:border-white/25 hover:text-white/75 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
                  </svg>
                  {copied === 'link' ? 'Copied!' : 'Copy Invite Link'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Pending */}
        {slot.status === 'pending' && (
          <>
            <div className="bg-white/[0.04] border border-orange-500/20 rounded-xl px-3 py-2.5">
              <p className="text-orange-300 text-[13px] font-mono font-semibold">{slot.code}</p>
              <p className="text-orange-400/70 text-[10px] font-bold tracking-[0.10em] uppercase mt-0.5">Read-Only</p>
            </div>
            <p className="text-white/40 text-[11px]">Invitee registered. Validation in progress.</p>
            <div className="flex gap-1.5">
              {[1,2,3].map((d) => (
                <div key={d} className={`flex-1 h-1.5 rounded-full ${d <= slot.days_completed ? 'bg-green-400' : 'bg-white/[0.10]'}`} />
              ))}
            </div>
            <p className="text-white/25 text-[10px]">Day {slot.days_completed} of 3 completed · tap to view</p>
          </>
        )}

        {/* Validated */}
        {slot.status === 'validated' && (
          <>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span className="text-green-300 text-[13px] font-mono font-semibold">{slot.code}</span>
              <span className="text-green-400 text-[12px]">✓</span>
            </div>
            <p className="text-white/40 text-[11px]">Participation requirement completed successfully.</p>
            {slot.validated_at && (
              <div className="flex items-center justify-between">
                <span className="text-white/35 text-[11px]">Validation Date</span>
                <span className="text-[12px] font-semibold" style={{ color:'#6B8AFF' }}>
                  {new Date(slot.validated_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                </span>
              </div>
            )}
            {slot.validated_at && (
              <div className="flex items-center justify-between">
                <span className="text-white/35 text-[11px]">Points Awarded</span>
                <span className="text-green-400 text-[12px] font-semibold">+10 pts</span>
              </div>
            )}
            <button onClick={() => setShowDetails(true)}
              className="w-full py-2 rounded-xl border border-green-500/20 text-green-400 text-[12px] font-medium hover:bg-green-500/10 transition-colors">
              View Activity Log
            </button>
          </>
        )}
      </div>

      {showDetails && (
        <ValidationModal slot={slot} onClose={() => setShowDetails(false)} />
      )}
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GrowthPage() {
  const router = useRouter()
  const [user,          setUser]          = useState<any>(null)
  const [profile,       setProfile]       = useState<any>(null)
  const [totalEntries,  setTotalEntries]  = useState(0)
  const [trackerCount,  setTrackerCount]  = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [dailyUsed,     setDailyUsed]     = useState(0)
  const [dailyLimit]                      = useState(10)
  const [resetIn,       setResetIn]       = useState('')
  const [slots,         setSlots]         = useState<InviteSlot[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      supabase.from('users').select('*').eq('email', session.user.email).single()
        .then(({ data }) => { setProfile(data); if (data) fetchAll(data) })
    })
  }, [])

  useEffect(() => {
    const tick = () => {
      const midnight = new Date(); midnight.setHours(24,0,0,0)
      const diff = Math.floor((midnight.getTime() - Date.now()) / 1000)
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60)
      setResetIn(`${h}h ${m}m`)
    }
    tick(); const id = setInterval(tick, 60000); return () => clearInterval(id)
  }, [])

  const fetchAll = async (prof: any) => {
    const todayMid = new Date(); todayMid.setHours(0,0,0,0)

    const [
      { count: entryCount },
      { count: tCount },
      { count: todayCount },
    ] = await Promise.all([
      supabase.from('entries').select('*', { count:'exact', head:true }).eq('user_id', prof.id),
      supabase.from('trackers').select('*', { count:'exact', head:true }).eq('tracked_id', prof.id),
      supabase.from('entries').select('*', { count:'exact', head:true }).eq('user_id', prof.id).gte('secured_at', todayMid.toISOString()),
    ])

    setTotalEntries(entryCount || 0)
    setTrackerCount(tCount || 0)
    setDailyUsed(todayCount || 0)

    // Referrals = codes that have been used (pending or validated)
    const { count: refCount } = await supabase
      .from('invite_codes').select('*', { count:'exact', head:true })
      .eq('created_by', prof.id).neq('status', 'available')
    setReferralCount(refCount || 0)

    // Load or create 3 invite slots
    const { data: existing } = await supabase
      .from('invite_codes').select('*')
      .eq('created_by', prof.id)
      .order('slot', { ascending: true })

    const existingSlotNums = (existing || []).map((s: any) => s.slot)
    const missing = [1, 2, 3].filter(n => !existingSlotNums.includes(n))

    if (missing.length > 0) {
      const toCreate = missing.map(n => ({
        created_by:       prof.id,
        slot:             n,
        code:             generateCode(),
        status:           'available',
        invitee_username: null,
        days_completed:   0,
        validated_at:     null,
        invitee_id:       null,
      }))
      await supabase.from('invite_codes').insert(toCreate)
      const { data: fresh } = await supabase
        .from('invite_codes').select('*')
        .eq('created_by', prof.id)
        .order('slot', { ascending: true })
      setSlots(mapSlots(fresh || []))
    } else {
      setSlots(mapSlots(existing || []))
    }
  }

  const mapSlots = (rows: any[]): InviteSlot[] =>
    rows.map(r => ({
      id:               r.id,
      slot:             r.slot,
      code:             r.code,
      status:           r.status as SlotStatus,
      invitee_username: r.invitee_username,
      days_completed:   r.days_completed || 0,
      validated_at:     r.validated_at,
      invitee_id:       r.invitee_id,
    }))

  const strengthPct = Math.min(((profile?.profile_strength || 0) / 500) * 100, 100)
  const strengthLabel = () => {
    const s = profile?.profile_strength || 0
    if (s === 0)   return 'Just getting started'
    if (s < 100)   return 'Building momentum'
    if (s < 250)   return 'Rising creator'
    if (s < 400)   return 'Power builder'
    return 'Elite creator'
  }

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  return (
    <DashboardLayout user={user}>
      <div className="max-w-[980px]">

        <div className="mb-7">
          <h1 className="text-white text-[26px] font-bold tracking-tight">Growth</h1>
          <p className="text-white/40 text-[14px] mt-1">Track your progress, credits, and milestones across Candoxa.</p>
        </div>

        {/* ── 2×2 stat grid ── */}
        <div className="grid grid-cols-2 gap-4 mb-7">
          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon>
                <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </StatIcon>
              <span className="text-white/60 text-[11px] font-bold tracking-[0.14em] uppercase">Profile Strength</span>
            </div>
            <p className="text-white text-[42px] font-bold leading-none mb-1">{profile?.profile_strength || 0}</p>
            <p className="text-[13px] font-medium mb-3" style={{ color:'#6B8AFF' }}>Out of 500 possible points</p>
            <div className="w-full h-[3px] bg-white/[0.07] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full" style={{ width:`${strengthPct}%`, background:'#0038FF' }} />
            </div>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/[0.15] text-white/55 bg-white/[0.04]">
              {strengthLabel()}
            </span>
          </div>

          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon>
                <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </StatIcon>
              <span className="text-white/60 text-[13px] font-semibold">Total Secured</span>
            </div>
            <p className="text-white text-[42px] font-bold leading-none mb-1">{totalEntries}</p>
            <p className="text-[13px] font-medium mb-2" style={{ color:'#6B8AFF' }}>records anchored to your identity</p>
            <p className="text-white/30 text-[12px]">{totalEntries === 0 ? 'No entries yet' : 'First entry this week'}</p>
          </div>

          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon>
                <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </StatIcon>
              <span className="text-white/60 text-[13px] font-semibold">Trackers</span>
            </div>
            <p className="text-white text-[42px] font-bold leading-none mb-1">{trackerCount}</p>
            <p className="text-[13px] font-medium mb-2" style={{ color:'#6B8AFF' }}>People tracking your profile</p>
            <p className="text-white/30 text-[12px]">Secure more entries to attract trackers</p>
          </div>

          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon>
                <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
                </svg>
              </StatIcon>
              <span className="text-white/60 text-[13px] font-semibold">Referrals</span>
            </div>
            <p className="text-white text-[42px] font-bold leading-none mb-1">{referralCount}</p>
            <p className="text-[13px] font-medium mb-2" style={{ color:'#6B8AFF' }}>Creators invited to Candoxa</p>
            <p className="text-white/30 text-[12px]">5 needed for Early user badge</p>
          </div>
        </div>

        {/* ── Daily Credits ── */}
        <div className="mb-8">
          <h2 className="text-white text-[18px] font-bold mb-3">Daily Credits</h2>
          <div className="border border-white/[0.10] bg-[#0A0A0F] rounded-2xl px-5 py-4 flex items-center gap-4">
            <CircularProgress used={dailyUsed} total={dailyLimit} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[14px]">
                {dailyLimit - dailyUsed} Free Secure Entries Remaining Today
              </p>
              <p className="text-white/35 text-[12px] mt-0.5">Each entry anchors one record permanently to your identity.</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-3 h-3 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <p className="text-white/25 text-[11px]">Resets in {resetIn}</p>
              </div>
            </div>
            <button onClick={() => router.push('/secured')}
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold flex-shrink-0 hover:opacity-90 transition-opacity"
              style={{ background:'#0038FF' }}>
              Secure Now
            </button>
          </div>
        </div>

        {/* ── Invite Builders ── */}
        <div>
          <h2 className="text-white text-[18px] font-bold mb-1">
            Invite Builders <span className="text-white/40 font-normal">(Testnet Access)</span>
          </h2>
          <p className="text-white/35 text-[13px] mb-5">
            Each user has 3 controlled invite codes. Successful invites require 1 secured entry per day for 3 consecutive days.
          </p>

          {slots.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <InviteSlotCard
                  key={slot.id}
                  slot={slot}
                  username={profile?.username || ''}
                  onRefresh={() => fetchAll(profile)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Invite summary ── */}
        {slots.some(s => s.status !== 'available') && (
          <div className="mt-6 border border-white/[0.08] bg-[#0A0A0F] rounded-2xl p-5">
            <p className="text-white/55 text-[11px] font-bold tracking-[0.12em] uppercase mb-4">Invite Summary</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Available',  val: slots.filter(s => s.status === 'available').length,  color: 'text-blue-400' },
                { label: 'Pending',    val: slots.filter(s => s.status === 'pending').length,    color: 'text-orange-400' },
                { label: 'Validated',  val: slots.filter(s => s.status === 'validated').length,  color: 'text-green-400' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-[28px] font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-white/35 text-[12px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg(3)}-${seg(6)}`
}