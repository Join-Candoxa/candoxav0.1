// components/admin/AdminUsers.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const PAGE_SIZE = 15
export type UserFilterType = 'all' | 'flagged' | 'most' | 'least'

interface UserRow {
  id: string
  username: string
  email: string
  avatar_url: string | null
  status: string | null
  profile_strength: number
  entry_count: number
  tracking_count: number
  tracked_count: number
  tracked_by: number
  created_at: string
  bio?: string
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function FlagIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 3h16l-3 6 3 6H4V3zm0 18V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M4 3l13 0-3 6 3 6H4" fill="currentColor" opacity="0.85"/>
    </svg>
  )
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?')[0].toUpperCase()
  const palette  = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color    = palette[initials.charCodeAt(0) % palette.length]
  const sz = size === 'sm' ? 'w-8 h-8 text-[12px]' : size === 'lg' ? 'w-14 h-14 text-[20px]' : 'w-10 h-10 text-[14px]'
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="text-white font-bold">{initials}</span>
    </div>
  )
}

function StatusCell({ status, joinedAt }: { status: string | null; joinedAt: string }) {
  const flagged = (status || '').toLowerCase() === 'flagged'
  const joined  = new Date(joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${flagged ? 'bg-orange-400' : 'bg-green-400'}`} />
        <span className={`text-[13px] font-medium ${flagged ? 'text-orange-400' : 'text-green-400'}`}>{flagged ? 'Flagged' : 'Active'}</span>
      </div>
      <span className="text-white/30 text-[11px] pl-3.5">Joined {joined}</span>
    </div>
  )
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  const pages: (number | '...')[] = []
  if (total <= 6) { for (let i = 1; i <= total; i++) pages.push(i) }
  else {
    pages.push(1, 2, 3)
    if (current > 4) pages.push('...')
    if (current > 3 && current < total - 2) pages.push(current)
    if (current < total - 3) pages.push('...')
    pages.push(total - 1, total)
  }
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {pages.map((p, i) =>
        p === '...' ? <span key={`d${i}`} className="text-white/25 text-[13px] px-1">…</span> : (
          <button key={p} onClick={() => onChange(p as number)}
            className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p === current ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}>
            {p}
          </button>
        )
      )}
    </div>
  )
}

// ─── Flag reasons ─────────────────────────────────────────────────────────────
const FLAG_REASONS   = ['Spam / Bot activity', 'Possible duplicate Entry', 'Fake account', 'Inappropriate content', 'Other']
const DELETE_REASONS = ['Spam / Bot activity', 'Possible duplicate Entry', 'Fake account', 'Terms violation', 'Other']

// ─── Small modal shell ────────────────────────────────────────────────────────
function SmallModal({ children, onClose, borderColor = 'border-white/[0.12]' }: {
  children: React.ReactNode; onClose: () => void; borderColor?: string
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`relative bg-[#0e0e14] border ${borderColor} rounded-2xl w-[440px] max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-colors z-10">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

// ─── Flag modal ───────────────────────────────────────────────────────────────
function FlagModal({ user, onClose, onConfirm }: { user: UserRow; onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <SmallModal onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <FlagIcon className="w-7 h-7 text-orange-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Flag @{user.username}'s Account?</h2>
        <p className="text-white/35 text-[12px] mb-5 leading-relaxed">Flagging restricts certain platform actions. The user will not be notified. All activity is logged with your admin credentials.</p>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-4 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <div className="text-left mb-4">
          <label className="text-white/50 text-[11px] font-medium mb-1.5 flex items-center gap-1 block">Reason for Flag <span className="text-blue-400">•</span></label>
          <div className="relative">
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/60 text-[13px] outline-none appearance-none cursor-pointer pr-8">
              <option value="">Select Reason</option>
              {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="text-left bg-white/[0.03] rounded-xl p-4 mb-5">
          <p className="text-white/45 text-[11px] font-medium mb-2">What happens when you flag this Account</p>
          {['Account is queued in Flagged Content for admin review','Referral earning is suspended pending review','Account remains active — user can still log in and view their profile','Flagging is reversible — can be cleared by any SuperAdmin','Action is permanently logged with admin ID, reason, and timestamp'].map((item) => (
            <p key={item} className="text-white/28 text-[11px] leading-relaxed">• {item}</p>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => reason && onConfirm(reason)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${reason ? 'bg-orange-500 hover:bg-orange-400 text-white' : 'bg-orange-500/25 text-orange-300/40 cursor-not-allowed'}`}>
            Confirm Flag
          </button>
        </div>
      </div>
    </SmallModal>
  )
}

function FlaggedConfirmModal({ user, reason, onClose }: { user: UserRow; reason: string; onClose: () => void }) {
  return (
    <SmallModal onClose={onClose} borderColor="border-orange-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4"><FlagIcon className="w-7 h-7 text-orange-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-4">Account Flagged & Under Review</h2>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-4 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <div className="text-left mb-5"><p className="text-white/45 text-[11px] font-medium mb-1">Reason for flag</p><p className="text-white/35 text-[12px]">• {reason}</p></div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </SmallModal>
  )
}

function ClearFlagModal({ user, onClose, onConfirm }: { user: UserRow; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <SmallModal onClose={onClose} borderColor="border-green-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"><FlagIcon className="w-7 h-7 text-green-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Clear Flag on @{user.username}'s?</h2>
        <p className="text-white/35 text-[12px] mb-4 leading-relaxed">Clearing restores the entry to its Secured status. Confirm that you've reviewed it and found no violations.</p>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-3 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <p className="text-orange-400/70 text-[11px] text-left mb-4">Flagged by admin@candoxa.com · 2 min ago</p>
        <div className="text-left bg-white/[0.03] rounded-xl p-4 mb-4">
          <p className="text-white/45 text-[11px] font-medium mb-2">What happens when you flag this entry</p>
          {['Entry status is restored to Secured — fully visible on public profile','Entry is removed from the Flagged Content queue','Clearance is recorded in the audit log','No notification is sent to the user'].map((item) => (
            <p key={item} className="text-green-400/60 text-[11px] leading-relaxed">• {item}</p>
          ))}
        </div>
        <div className="text-left mb-5">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Clearance Note (Optional) •</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="e.g. Reviewed screenshot verified as authentic"
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/60 text-[13px] outline-none resize-none placeholder-white/20" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => onConfirm(note)} className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[13px] font-semibold transition-colors">Clear Flag</button>
        </div>
      </div>
    </SmallModal>
  )
}

function FlagClearedModal({ user, note, onClose }: { user: UserRow; note: string; onClose: () => void }) {
  return (
    <SmallModal onClose={onClose} borderColor="border-green-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"><FlagIcon className="w-7 h-7 text-green-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-4">Flag Cleared</h2>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-3 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <p className="text-white/25 text-[11px] mb-3">Prev. Flagged by admin · 2 min ago</p>
        {note && <div className="text-left mb-4"><p className="text-white/45 text-[11px] font-medium mb-1">Clearance note</p><p className="text-white/35 text-[12px]">• {note}</p></div>}
        <button onClick={onClose} className="w-full mt-2 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </SmallModal>
  )
}

function DeleteModal({ user, onClose, onConfirm }: { user: UserRow; onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState('')
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
  return (
    <SmallModal onClose={onClose} borderColor="border-red-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-7 h-7 text-red-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-4">Delete @{user.username}'s Account?</h2>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-4 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <div className="text-left mb-4">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Reason for Delete •</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/60 text-[13px] outline-none appearance-none cursor-pointer">
            <option value="">Select Reason</option>
            {DELETE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 text-left mb-4">
          <p className="text-red-300 text-[12px] font-semibold mb-1">This action is permanent and irreversible</p>
          <p className="text-red-300/55 text-[11px] leading-relaxed">This is a permanent action. Removing an account cannot be undone. The on-chain timestamp record will remain, but the entry will be delisted from all public views.</p>
          <p className="text-red-400/40 text-[10px] mt-2">Logged by admin@candoxa.com · 2 min ago</p>
        </div>
        <div className="text-left mb-5">
          <p className="text-white/30 text-[11px]">Removal logged by:</p>
          <p className="text-blue-400 text-[11px]">• SuperAdmin · {now}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => reason && onConfirm(reason)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${reason ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-red-500/25 text-red-300/40 cursor-not-allowed'}`}>
            Remove Permanently
          </button>
        </div>
      </div>
    </SmallModal>
  )
}

function DeletedConfirmModal({ user, reason, onClose }: { user: UserRow; reason: string; onClose: () => void }) {
  return (
    <SmallModal onClose={onClose} borderColor="border-red-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-7 h-7 text-red-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-4">Account Permanently deleted & Logged</h2>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-4 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white/50 text-[13px] font-medium">@{user.username}</p><p className="text-white/25 text-[11px]">{user.email}</p></div>
        </div>
        <div className="text-left mb-5"><p className="text-white/45 text-[11px] font-medium mb-1">Reason for Deletion</p><p className="text-white/35 text-[12px]">• {reason}</p></div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </SmallModal>
  )
}

// ─── User Detail Modal — CENTERED, matches Figma layout exactly ───────────────
type ModalState = 'none' | 'flag' | 'flagged_confirm' | 'clear_flag' | 'flag_cleared' | 'delete' | 'deleted_confirm'

function UserDetailModal({ user, onClose, onUserUpdated }: {
  user: UserRow; onClose: () => void; onUserUpdated: () => void
}) {
  const [modalState,   setModalState]   = useState<ModalState>('none')
  const [actionReason, setActionReason] = useState('')
  const [entries,      setEntries]      = useState<any[]>([])
  const [activeTab,    setActiveTab]    = useState<'secured' | 'about' | 'badge'>('secured')
  const isFlagged = (user.status || '').toLowerCase() === 'flagged'
  const strengthPct = Math.min((user.profile_strength / 500) * 100, 100)

  useEffect(() => {
    supabase.from('entries').select('*').eq('user_id', user.id)
      .order('secured_at', { ascending: false }).limit(9)
      .then(({ data }) => setEntries(data || []))
  }, [user.id])

  const handleFlagConfirm = async (reason: string) => {
    await supabase.from('users').update({ status: 'flagged' }).eq('id', user.id)
    setActionReason(reason); setModalState('flagged_confirm'); onUserUpdated()
  }
  const handleClearFlagConfirm = async (note: string) => {
    await supabase.from('users').update({ status: 'active' }).eq('id', user.id)
    setActionReason(note); setModalState('flag_cleared'); onUserUpdated()
  }
  const handleDeleteConfirm = async (reason: string) => {
    await supabase.from('users').delete().eq('id', user.id)
    setActionReason(reason); setModalState('deleted_confirm'); onUserUpdated()
  }

  return (
    <>
      {/* Centered modal overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
        <div className="bg-[#0e0e14] border border-white/[0.10] rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-2xl">

          {/* Top bar — flag icon left, trash icon, close right */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
            <button
              onClick={() => isFlagged ? setModalState('clear_flag') : setModalState('flag')}
              title={isFlagged ? 'Clear Flag' : 'Flag user'}
              className={`p-2 rounded-lg transition-colors ${isFlagged ? 'text-orange-400 bg-orange-500/15 hover:bg-orange-500/25' : 'text-white/40 hover:text-orange-400 hover:bg-orange-500/10'}`}
            >
              <FlagIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModalState('delete')}
              title="Delete user"
              className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          {/* Already flagged banner */}
          {isFlagged && (
            <div className="mx-5 mt-4 bg-yellow-500/10 border-l-4 border-yellow-400 rounded-r-xl px-4 py-3">
              <p className="text-yellow-300 text-[12px] font-semibold mb-0.5">Already Flagged & Under review</p>
              <p className="text-yellow-300/50 text-[11px] leading-relaxed">This entry was flagged by another admin 2 minutes ago and is currently in the review queue. Avoid duplicate actions.</p>
              <p className="text-yellow-300/30 text-[10px] mt-1">Flagged by admin@candoxa.com · 2 min ago</p>
            </div>
          )}

          <div className="p-5">
            {/* ── Row 1: Avatar + info LEFT | Stats RIGHT ── */}
            <div className="flex items-start gap-4 mb-5">
              <Avatar src={user.avatar_url} name={user.username} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[15px]">@{user.username}</p>
                <p className="text-white/35 text-[12px] mt-0.5 leading-relaxed line-clamp-3">
                  {user.bio || 'No bio provided.'}
                </p>
              </div>
              {/* Stats — right side */}
              <div className="flex gap-5 flex-shrink-0 text-center">
                {[
                  { label: 'Entries',    val: user.entry_count },
                  { label: 'Tracked by', val: user.tracked_by || 0 },
                  { label: 'Tracking',   val: user.tracking_count },
                  { label: 'Strength',   val: user.profile_strength },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-white font-bold text-[15px]">{s.val}</p>
                    <p className="text-white/30 text-[10px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Row 2: Profile strength LEFT | Badges RIGHT ── */}
            <div className="flex gap-5 mb-5">
              {/* Profile strength */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/40 text-[11px]">Profile Strength</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/55 text-[11px] font-medium">{user.profile_strength}pts</span>
                    <span className="text-white/30 text-[10px]">Beginner</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${strengthPct}%` }} />
                </div>
              </div>

              {/* Badges & Milestones */}
              <div className="flex-1">
                <p className="text-white/40 text-[11px] mb-1.5 font-medium">Badges & Milestones</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Beginner',     sub: '210',       icon: '⭐' },
                    { label: 'Builder',      sub: '50pts',     icon: '🔒' },
                    { label: 'Sec. Founder', sub: '100 pts',   icon: '🏆' },
                    { label: 'Consistent',   sub: '7-day streak', icon: '📅' },
                  ].map((b) => (
                    <div key={b.label} className="flex flex-col items-center gap-0.5 bg-white/[0.04] rounded-xl px-2 py-2 flex-1">
                      <span className="text-sm">{b.icon}</span>
                      <p className="text-white/55 text-[9px] font-medium text-center leading-tight">{b.label}</p>
                      <p className="text-white/25 text-[8px] text-center">{b.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-white/[0.08] mb-4">
              {(['secured', 'about', 'badge'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-3 mr-8 text-[13px] font-medium capitalize transition-colors ${activeTab === tab ? 'text-white border-b-2 border-white' : 'text-white/30 hover:text-white/55'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            {activeTab === 'secured' && (
              entries.length === 0
                ? <p className="text-white/20 text-sm py-4">No entries yet.</p>
                : (
                  <div className="grid grid-cols-3 gap-3">
                    {entries.map((entry) => {
                      const st = (entry.status || 'secured').toLowerCase()
                      return (
                        <div key={entry.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
                          {/* Platform icon + title */}
                          <div className="p-3 flex-1">
                            <div className="flex items-start gap-2 mb-1.5">
                              <div className="w-5 h-5 rounded-[4px] bg-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[9px] text-white/50 font-bold">{(entry.platform || '?')[0].toUpperCase()}</span>
                              </div>
                              <p className="text-white/70 text-[11px] font-medium leading-tight line-clamp-2">{entry.title || 'Untitled'}</p>
                            </div>
                            <p className="text-white/28 text-[10px] leading-relaxed line-clamp-3">{entry.description || ''}</p>
                          </div>
                          {entry.screenshot_url && (
                            <img src={entry.screenshot_url} alt="" className="w-full h-20 object-cover" />
                          )}
                          {/* Bottom bar */}
                          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/[0.05]">
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              st === 'flagged' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' :
                              st === 'deleted' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                            }`}>
                              {entry.status || 'Secured'}
                            </span>
                            <span className="text-white/20 text-[9px] flex-1 truncate">
                              {entry.secured_at ? new Date(entry.secured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </span>
                            {/* Per-card flag + delete */}
                            <button className="text-white/25 hover:text-orange-400 transition-colors p-0.5"><FlagIcon className="w-3 h-3" /></button>
                            <button className="text-white/25 hover:text-red-400 transition-colors p-0.5"><TrashIcon className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
            )}

            {activeTab === 'about' && (
              <div className="space-y-4 py-2">
                <div><p className="text-white/35 text-[11px] mb-1">Email</p><p className="text-white/70 text-[13px]">{user.email}</p></div>
                <div><p className="text-white/35 text-[11px] mb-1">Joined</p><p className="text-white/70 text-[13px]">{new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
                <div><p className="text-white/35 text-[11px] mb-1">Status</p><p className={`text-[13px] font-medium ${isFlagged ? 'text-orange-400' : 'text-green-400'}`}>{isFlagged ? 'Flagged' : 'Active'}</p></div>
                <div><p className="text-white/35 text-[11px] mb-1">Profile Strength</p><p className="text-white/70 text-[13px]">{user.profile_strength} pts</p></div>
              </div>
            )}

            {activeTab === 'badge' && (
              <p className="text-white/20 text-sm py-4">Badge history coming soon.</p>
            )}
          </div>
        </div>
      </div>

      {/* Action modals — stack above detail modal */}
      {modalState === 'flag'            && <FlagModal            user={user} onClose={() => setModalState('none')} onConfirm={handleFlagConfirm} />}
      {modalState === 'flagged_confirm' && <FlaggedConfirmModal  user={user} reason={actionReason} onClose={() => { setModalState('none'); onClose() }} />}
      {modalState === 'clear_flag'      && <ClearFlagModal       user={user} onClose={() => setModalState('none')} onConfirm={handleClearFlagConfirm} />}
      {modalState === 'flag_cleared'    && <FlagClearedModal     user={user} note={actionReason} onClose={() => { setModalState('none'); onClose() }} />}
      {modalState === 'delete'          && <DeleteModal          user={user} onClose={() => setModalState('none')} onConfirm={handleDeleteConfirm} />}
      {modalState === 'deleted_confirm' && <DeletedConfirmModal  user={user} reason={actionReason} onClose={() => { setModalState('none'); onClose() }} />}
    </>
  )
}

// ─── Main AdminUsers ──────────────────────────────────────────────────────────
export default function AdminUsers({
  activeFilter = 'all',
  onFilterChange,
}: {
  activeFilter?: UserFilterType
  onFilterChange?: (f: UserFilterType) => void
}) {
  const [users,           setUsers]           = useState<UserRow[]>([])
  const [total,           setTotal]           = useState(0)
  const [page,            setPage]            = useState(1)
  const [selectedUser,    setSelectedUser]    = useState<UserRow | null>(null)
  const [uptime,          setUptime]          = useState('—')
  const [platformStartMs, setPlatformStartMs] = useState<number | null>(null)

  useEffect(() => {
    if (!platformStartMs) return
    const tick = () => {
      const e = Math.floor((Date.now() - platformStartMs) / 1000)
      const d = Math.floor(e / 86400), h = Math.floor((e % 86400) / 3600), m = Math.floor((e % 3600) / 60), s = e % 60
      setUptime(`${d}d ${h}h ${m}m ${s}s`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [platformStartMs])

  const fetchUsers = useCallback(async () => {
    const { data: firstUser } = await supabase.from('users').select('created_at').order('created_at', { ascending: true }).limit(1).single()
    if (firstUser?.created_at) setPlatformStartMs(new Date(firstUser.created_at).getTime())

    const { data: ec } = await supabase.from('entries').select('user_id')
    const countMap: Record<string, number> = {}
    ec?.forEach((e: any) => { countMap[e.user_id] = (countMap[e.user_id] || 0) + 1 })

    let query = supabase.from('users')
      .select('id, username, email, avatar_url, status, profile_strength, created_at, bio', { count: 'exact' })
    if (activeFilter === 'flagged') query = query.eq('status', 'flagged')

    const { data, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    let rows: UserRow[] = (data || []).map((u: any) => ({
      id: u.id, username: u.username || u.email?.split('@')[0] || '—',
      email: u.email || '—', avatar_url: u.avatar_url || null,
      status: u.status || 'active', profile_strength: u.profile_strength || 0,
      entry_count: countMap[u.id] || 0, tracking_count: 0, tracked_count: 0, tracked_by: 0,
      created_at: u.created_at, bio: u.bio || '',
    }))

    if (activeFilter === 'most')  rows = [...rows].sort((a, b) => b.entry_count - a.entry_count)
    if (activeFilter === 'least') rows = [...rows].sort((a, b) => a.entry_count - b.entry_count)

    setUsers(rows); setTotal(count || 0)
  }, [activeFilter, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">User <span className="text-blue-400">Management</span></h1>
          <p className="text-white/35 text-sm mt-1">View, filter, and moderate all users across the platform.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Total Uptime: <span className="text-white/55 font-mono">{uptime}</span></p>
        </div>
      </div>

      {/* Table header row — dark navy */}
      <div className="grid rounded-xl bg-[#0d1529] mb-1" style={{ gridTemplateColumns: '2.5fr 1.8fr 1.4fr 0.7fr 0.7fr 0.7fr' }}>
        {['User', 'Status', 'Profile strength', 'Entries', 'Tracking', 'Tracked'].map((col) => (
          <div key={col} className="px-4 py-3.5">
            <span className="text-white/70 text-[12px] font-semibold">{col}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      {users.length === 0
        ? <div className="py-16 text-center"><p className="text-white/20 text-sm">No users found.</p></div>
        : users.map((user, idx) => (
          <div key={user.id} onClick={() => setSelectedUser(user)}
            className={`grid items-center py-4 cursor-pointer hover:bg-white/[0.025] rounded-xl transition-colors ${idx < users.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
            style={{ gridTemplateColumns: '2.5fr 1.8fr 1.4fr 0.7fr 0.7fr 0.7fr' }}>
            <div className="px-3 flex items-center gap-3 min-w-0">
              <Avatar src={user.avatar_url} name={user.username} size="sm" />
              <div className="min-w-0">
                <p className="text-white text-[13px] font-medium truncate">{user.username}</p>
                <p className="text-white/30 text-[11px] truncate">{user.email}</p>
              </div>
            </div>
            <div className="px-3"><StatusCell status={user.status} joinedAt={user.created_at} /></div>
            <div className="px-3"><span className="text-white/80 text-[14px] font-medium">{user.profile_strength.toLocaleString()} pts</span></div>
            <div className="px-3"><span className="text-white/75 text-[14px]">{user.entry_count || '—'}</span></div>
            <div className="px-3"><span className="text-white/75 text-[14px]">{user.tracking_count || '—'}</span></div>
            <div className="px-3"><span className="text-white/75 text-[14px]">{user.tracked_count || '—'}</span></div>
          </div>
        ))
      }

      <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUserUpdated={() => { fetchUsers(); setSelectedUser(null) }} />
      )}
    </div>
  )
}