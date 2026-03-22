// components/admin/AdminEntries.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const PAGE_SIZE = 20
export type EntryFilterType = 'all' | 'flagged' | 'most' | 'least'

interface EntryRow {
  id: string
  title: string
  url: string | null
  platform: string
  user_id: string
  username: string
  status: string
  points: number | null
  secured_at: string
  screenshot_url: string | null
  blockchain_ref: string | null
  chain: string | null
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime(), m = Math.floor(diff / 60000)
  if (m < 1) return 'Now'
  if (m < 60) return `${m} mins`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hrs ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtUptime(s: number) {
  return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`
}

// ─── Platform icon ────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
  youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
  twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
}
function PlatformIcon({ platform, size = 28 }: { platform: string; size?: number }) {
  const src = ICON_MAP[(platform || '').toLowerCase()] ?? '/icons/others.png'
  return (
    <div className="rounded-[6px] bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size }}>
      <Image src={src} alt={platform} width={size - 8} height={size - 8} className="rounded-[3px]" />
    </div>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const s = (status || 'secured').toLowerCase()
  const cfg = {
    secured: { dot: 'bg-blue-500',   text: 'text-blue-400',   label: 'Secured'  },
    flagged: { dot: 'bg-orange-400', text: 'text-orange-400', label: 'Flagged'  },
    deleted: { dot: 'bg-red-500',    text: 'text-red-400',    label: 'Deleted'  },
    active:  { dot: 'bg-green-400',  text: 'text-green-400',  label: 'Active'   },
  }[s] ?? { dot: 'bg-white/30', text: 'text-white/40', label: status }
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#111118] border border-white/[0.08] rounded-full px-2.5 py-[5px]">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
    </span>
  )
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
function FlagSVG({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 12 12" fill="currentColor" className={className}><path d="M2 1.5h8l-2.5 4 2.5 4H2V1.5z"/><line x1="2" y1="1" x2="2" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
function TrashSVG({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className={className}><path d="M1.5 3h9M4 3V2h4v1M5 5v4M7 5v4M2.5 3l.5 7h6l.5-7"/></svg>
}
function ReceiptSVG({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 1v10l1.5-1 1 1 1-1 1 1 1-1L10 11V1l-1.5 1-1-1-1 1-1-1-1 1L2 1z"/><line x1="4" y1="5" x2="8" y2="5"/><line x1="4" y1="7" x2="7" y2="7"/></svg>
}
function XCircleSVG({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className}><circle cx="6" cy="6" r="4.5"/><path d="M4 4l4 4M8 4l-4 4"/></svg>
}

// ─── Control buttons ──────────────────────────────────────────────────────────
function ControlButtons({ status, onFlag, onClear, onRemove, onReceipt }: {
  status: string; onFlag: () => void; onClear: () => void; onRemove: () => void; onReceipt: () => void
}) {
  const s = (status || '').toLowerCase()
  const isDeleted = s === 'deleted'
  const isFlagged = s === 'flagged'
  // Base: small dark rounded-full pill
  const base = 'inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold transition-all select-none cursor-pointer'

  if (isDeleted) return (
    <div className="flex items-center gap-2 opacity-25 pointer-events-none">
      <span className={`${base} bg-[#0e0e14] border border-white/[0.07] text-white/30`}>Clear <FlagSVG className="w-2.5 h-2.5"/></span>
      <span className={`${base} bg-[#0e0e14] border border-white/[0.07] text-white/30`}>Remove <XCircleSVG className="w-2.5 h-2.5"/></span>
      <span className={`${base} bg-blue-600/20 border border-blue-500/20 text-blue-400/30`}>Reciept <ReceiptSVG className="w-2.5 h-2.5"/></span>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      {isFlagged
        ? <button onClick={onClear} className={`${base} bg-[#0e0e14] border border-green-500/50 text-white/70 hover:text-white hover:border-green-400`}>
            Clear <FlagSVG className="w-2.5 h-2.5 text-green-400"/>
          </button>
        : <button onClick={onFlag} className={`${base} bg-[#0e0e14] border border-white/[0.10] text-white/60 hover:text-white hover:border-orange-400/50`}>
            Flag <FlagSVG className="w-2.5 h-2.5"/>
          </button>
      }
      <button onClick={onRemove} className={`${base} bg-[#0e0e14] border border-red-500/40 text-white/60 hover:text-white hover:border-red-400`}>
        Remove <XCircleSVG className="w-2.5 h-2.5 text-red-400"/>
      </button>
      <button onClick={onReceipt} className={`${base} bg-blue-600 border border-blue-600 text-white hover:bg-blue-500`}>
        Reciept <ReceiptSVG className="w-2.5 h-2.5"/>
      </button>
    </div>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ children, onClose, borderColor = 'border-white/[0.12]', maxW = '520px' }: {
  children: React.ReactNode; onClose: () => void; borderColor?: string; maxW?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative bg-[#0e0e14] border rounded-2xl overflow-hidden shadow-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ borderColor: borderColor.replace('border-',''), maxWidth: maxW }}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white z-10 transition-colors">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

// Entry preview row used inside modals
function EntryPreviewRow({ entry }: { entry: EntryRow }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
      <PlatformIcon platform={entry.platform} size={28} />
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-[13px] font-medium truncate">{entry.title}</p>
        {entry.url && <p className="text-white/30 text-[11px] truncate">{entry.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,40)}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white/55 text-[12px] font-medium">@{entry.username}</p>
        <p className="text-white/25 text-[10px]">Secured: {fmtDate(entry.secured_at)}</p>
      </div>
    </div>
  )
}

const FLAG_REASONS   = ['Spam / Bot activity','Possible duplicate Entry','Fabricated stats suspected','Fake account','Inappropriate content','Other']
const DELETE_REASONS = ['Spam / Bot activity','Possible duplicate Entry','Fake account','Terms violation','Other']

// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ entry, onClose, onFlag, onClear, onRemove }: {
  entry: EntryRow; onClose: () => void; onFlag: () => void; onClear: () => void; onRemove: () => void
}) {
  const s         = (entry.status || '').toLowerCase()
  const isFlagged = s === 'flagged'
  const isSecured = s === 'secured'

  return (
    <Modal onClose={onClose} borderColor="rgba(99,102,241,0.5)" maxW="480px">
      {/* Thumbnail */}
      <div className="relative w-full h-48 bg-[#0a0a12] overflow-hidden">
        {entry.screenshot_url
          ? <img src={entry.screenshot_url} alt="thumbnail" className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <PlatformIcon platform={entry.platform} size={48} />
            </div>
          )
        }
        {/* "Onchain Human Readable Reciept" badge */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white text-[10px] font-semibold tracking-wide">Onchain Human Readable Reciept</span>
        </div>
      </div>

      <div className="p-5">
        <h2 className="text-white font-bold text-[17px] mb-4 text-center">{entry.title}</h2>

        {/* Status banner */}
        {isFlagged ? (
          <div className="bg-yellow-500/10 border-l-4 border-yellow-400 rounded-r-xl px-4 py-3 mb-4">
            <p className="text-yellow-300 text-[12px] font-semibold mb-0.5">Already Flagged & Under review</p>
            <p className="text-yellow-300/55 text-[11px] leading-relaxed">This entry was flagged by another admin 2 minutes ago and is currently in the review queue. Avoid duplicate actions.</p>
            <p className="text-yellow-300/35 text-[10px] mt-1">Flagged by admin@candoxa.com · 2 min ago</p>
          </div>
        ) : isSecured ? (
          <div className="bg-green-500/10 border-l-4 border-green-400 rounded-r-xl px-4 py-3 mb-4">
            <p className="text-green-300 text-[12px] font-semibold mb-0.5">Entry Ok</p>
            <p className="text-green-300/60 text-[11px] leading-relaxed">No violations found. This entry has been reviewed and its Secured status has been fully restored.</p>
          </div>
        ) : null}

        {/* Detail rows */}
        <div className="space-y-0 divide-y divide-white/[0.05] border border-white/[0.07] rounded-xl overflow-hidden mb-5">
          {[
            { label: 'Secured On',     value: new Date(entry.secured_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' · ' + new Date(entry.secured_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) + ' UTC' },
            { label: 'Creator',        value: `@${entry.username}`, accent: true },
            { label: 'Platform',       value: entry.platform || '—' },
            { label: 'Status',         value: null, statusBadge: true },
            { label: 'Blockchain Ref', value: entry.blockchain_ref ? entry.blockchain_ref.slice(0,18) + '...' : '—' },
            { label: 'Chain',          value: entry.chain || '—' },
          ].map((row: any) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d14]">
              <span className="text-white/35 text-[12px]">{row.label}</span>
              {row.statusBadge
                ? <StatusPill status={entry.status} />
                : <span className={`text-[12px] ${row.accent ? 'text-blue-400' : 'text-white/65'}`}>{row.value}</span>
              }
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {isFlagged ? (
            <>
              <button onClick={onClear}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[13px] font-semibold transition-colors">
                Clear Flag <FlagSVG className="w-3.5 h-3.5" />
              </button>
              <button onClick={onRemove}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a24] border border-white/[0.10] text-white/70 hover:text-white text-[13px] font-semibold transition-colors">
                Remove Entry <TrashSVG className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={onFlag}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-[13px] font-semibold transition-colors">
                Flag <FlagSVG className="w-3.5 h-3.5" />
              </button>
              <button onClick={onRemove}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[13px] font-semibold transition-colors">
                Remove Entry <TrashSVG className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Flag Modal ───────────────────────────────────────────────────────────────
function FlagModal({ entry, onClose, onConfirm }: { entry: EntryRow; onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal onClose={onClose} borderColor="rgba(249,115,22,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <FlagSVG className="w-7 h-7 text-orange-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Flag @{entry.username}'s Entry?</h2>
        <p className="text-white/35 text-[12px] mb-5 leading-relaxed">
          Flagging will mark this entry for review. It stays visible to the user but is queued for moderation. This action is logged.
        </p>
        <EntryPreviewRow entry={entry} />
        <div className="text-left mt-4 mb-4">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 flex items-center gap-1">Reason for Flag <span className="text-blue-400">•</span></label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/55 text-[13px] outline-none appearance-none cursor-pointer">
            <option value="">Select Reason</option>
            {FLAG_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="text-left bg-white/[0.03] rounded-xl p-4 mb-5">
          <p className="text-white/40 text-[11px] font-medium mb-2">What happens when you flag this entry</p>
          {['Entry is queued in the Flagged Content panel for admin review','Entry remains visible to the user — no notification is sent','Entry status changes from Secured to Flagged on the admin side','This action is permanently recorded in the audit log'].map((t) => (
            <p key={t} className="text-white/25 text-[11px] leading-relaxed">• {t}</p>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => reason && onConfirm(reason)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${reason ? 'bg-orange-500 hover:bg-orange-400 text-white' : 'bg-orange-500/20 text-orange-300/40 cursor-not-allowed'}`}>
            Confirm Flag
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Flagged Confirm ──────────────────────────────────────────────────────────
function FlaggedConfirmModal({ entry, reason, onClose }: { entry: EntryRow; reason: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} borderColor="rgba(249,115,22,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <FlagSVG className="w-7 h-7 text-orange-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-5">Entry Flagged & Under Review</h2>
        <EntryPreviewRow entry={entry} />
        <div className="text-left mt-4 mb-5">
          <p className="text-white/40 text-[11px] font-medium mb-1">Reason for flag</p>
          <p className="text-white/30 text-[12px]">• {reason}</p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </Modal>
  )
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ entry, onClose, onConfirm }: { entry: EntryRow; onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState('')
  const now = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) + ' UTC'
  return (
    <Modal onClose={onClose} borderColor="rgba(239,68,68,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <TrashSVG className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-4">Delete @{entry.username}'s Entry?</h2>
        <EntryPreviewRow entry={entry} />
        <div className="text-left mt-4 mb-4">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Reason for Delete •</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/55 text-[13px] outline-none appearance-none cursor-pointer">
            <option value="">Select Reason</option>
            {DELETE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 text-left mb-4">
          <p className="text-red-300 text-[12px] font-semibold mb-1">This action is permanent and irreversible</p>
          <p className="text-red-300/55 text-[11px] leading-relaxed mb-2">This is a permanent action. Removing an entry cannot be undone. The on-chain timestamp record will remain, but the entry will be delisted from all public views.</p>
          <p className="text-red-400/40 text-[10px]">Logged by admin@candoxa.com · 2 min ago</p>
        </div>
        <div className="text-left mb-5">
          <p className="text-white/30 text-[11px]">Removal logged by:</p>
          <p className="text-blue-400 text-[11px]">• SuperAdmin · {now}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => reason && onConfirm(reason)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${reason ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-red-500/20 text-red-300/40 cursor-not-allowed'}`}>
            Remove Permanently
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Deleted Confirm ──────────────────────────────────────────────────────────
function DeletedConfirmModal({ entry, reason, onClose }: { entry: EntryRow; reason: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} borderColor="rgba(239,68,68,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <TrashSVG className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-5">Entry Permanently deleted & Logged</h2>
        <EntryPreviewRow entry={entry} />
        <div className="text-left mt-4 mb-5">
          <p className="text-white/40 text-[11px] font-medium mb-1">Reason for Deletion</p>
          <p className="text-white/30 text-[12px]">• {reason}</p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </Modal>
  )
}

// ─── Clear Flag Modal ─────────────────────────────────────────────────────────
function ClearFlagModal({ entry, onClose, onConfirm }: { entry: EntryRow; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <Modal onClose={onClose} borderColor="rgba(34,197,94,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <FlagSVG className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Clear Flag on @{entry.username}'s Entry?</h2>
        <p className="text-white/35 text-[12px] mb-4 leading-relaxed">Clearing restores the entry to its Secured status. Confirm that you've reviewed it and found no violations.</p>
        <EntryPreviewRow entry={entry} />
        <p className="text-orange-400/70 text-[11px] text-left mt-3 mb-4">Flagged by admin@candoxa.com · 2 min ago</p>
        <div className="text-left bg-white/[0.03] rounded-xl p-4 mb-4">
          <p className="text-white/40 text-[11px] font-medium mb-2">What happens when you flag this entry</p>
          {['Entry status is restored to Secured — fully visible on public profile','Entry is removed from the Flagged Content queue','Clearance is recorded in the audit log','No notification is sent to the user'].map((t) => (
            <p key={t} className="text-green-400/60 text-[11px] leading-relaxed">• {t}</p>
          ))}
        </div>
        <div className="text-left mb-5">
          <label className="text-white/40 text-[11px] font-medium mb-1.5 block">Clearance Note (Optional) •</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="e.g Reviewed screenshot verified as authentic"
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/55 text-[13px] outline-none resize-none placeholder-white/20" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => onConfirm(note)} className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[13px] font-semibold transition-colors">Clear Flag</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Flag Cleared Confirm ─────────────────────────────────────────────────────
function FlagClearedModal({ entry, note, onClose }: { entry: EntryRow; note: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} borderColor="rgba(34,197,94,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <FlagSVG className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-white font-bold text-[16px] mb-5">Flag Cleared</h2>
        <EntryPreviewRow entry={entry} />
        <p className="text-white/25 text-[11px] mt-3 mb-3">Prev.Flagged by admin@candoxa.com · 2 min ago</p>
        {note && (
          <div className="text-left mb-4">
            <p className="text-white/40 text-[11px] font-medium mb-1">Clearance note</p>
            <p className="text-white/30 text-[12px]">• {note}</p>
          </div>
        )}
        <button onClick={onClose} className="w-full mt-2 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">Close</button>
      </div>
    </Modal>
  )
}

// ─── Modal state machine ──────────────────────────────────────────────────────
type ModalType = 'none' | 'receipt' | 'flag' | 'flag_confirm' | 'delete' | 'delete_confirm' | 'clear_flag' | 'flag_cleared'

function EntryModals({ entry, onClose, onRefresh }: {
  entry: EntryRow; onClose: () => void; onRefresh: () => void
}) {
  const [modal,  setModal]  = useState<ModalType>('receipt')
  const [reason, setReason] = useState('')

  const confirmFlag = async (r: string) => {
    await supabase.from('entries').update({ status: 'flagged' }).eq('id', entry.id)
    setReason(r); setModal('flag_confirm'); onRefresh()
  }
  const confirmDelete = async (r: string) => {
    await supabase.from('entries').delete().eq('id', entry.id)
    setReason(r); setModal('delete_confirm'); onRefresh()
  }
  const confirmClearFlag = async (note: string) => {
    await supabase.from('entries').update({ status: 'secured' }).eq('id', entry.id)
    setReason(note); setModal('flag_cleared'); onRefresh()
  }

  const close = () => { setModal('none'); onClose() }

  if (modal === 'none') return null

  if (modal === 'receipt')      return <ReceiptModal      entry={entry} onClose={close} onFlag={() => setModal('flag')} onClear={() => setModal('clear_flag')} onRemove={() => setModal('delete')} />
  if (modal === 'flag')         return <FlagModal         entry={entry} onClose={() => setModal('receipt')} onConfirm={confirmFlag} />
  if (modal === 'flag_confirm') return <FlaggedConfirmModal entry={entry} reason={reason} onClose={close} />
  if (modal === 'delete')       return <DeleteModal       entry={entry} onClose={() => setModal('receipt')} onConfirm={confirmDelete} />
  if (modal === 'delete_confirm') return <DeletedConfirmModal entry={entry} reason={reason} onClose={close} />
  if (modal === 'clear_flag')   return <ClearFlagModal    entry={entry} onClose={() => setModal('receipt')} onConfirm={confirmClearFlag} />
  if (modal === 'flag_cleared') return <FlagClearedModal  entry={entry} note={reason} onClose={close} />
  return null
}

// ─── Pagination ───────────────────────────────────────────────────────────────
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
        p === '...' ? <span key={`d${i}`} className="text-white/25 text-[13px] px-1">…</span> :
        <button key={p} onClick={() => onChange(p as number)}
          className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p === current ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}>
          {p}
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminEntries({ activeFilter = 'all' }: { activeFilter?: EntryFilterType }) {
  const [entries,         setEntries]         = useState<EntryRow[]>([])
  const [total,           setTotal]           = useState(0)
  const [page,            setPage]            = useState(1)
  const [activeEntry,     setActiveEntry]     = useState<EntryRow | null>(null)
  const [uptime,          setUptime]          = useState('—')
  const [platformStartMs, setPlatformStartMs] = useState<number | null>(null)

  useEffect(() => {
    if (!platformStartMs) return
    const tick = () => setUptime(fmtUptime(Math.floor((Date.now() - platformStartMs) / 1000)))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [platformStartMs])

  const fetchEntries = useCallback(async () => {
    const { data: fu } = await supabase.from('users').select('created_at').order('created_at', { ascending: true }).limit(1).single()
    if (fu?.created_at) setPlatformStartMs(new Date(fu.created_at).getTime())

    let q = supabase
      .from('entries')
      .select('id, title, url, platform, user_id, status, secured_at, points, screenshot_url, blockchain_ref, chain, users(username)', { count: 'exact' })
      .order('secured_at', { ascending: false })

    if (activeFilter === 'flagged') q = q.eq('status', 'flagged')

    const { data, count } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    let rows: EntryRow[] = (data || []).map((e: any) => ({
      id: e.id, title: e.title || 'Untitled', url: e.url || null,
      platform: e.platform || 'others', user_id: e.user_id,
      username: e.users?.username || '—', status: e.status || 'secured',
      points: e.points ?? null, secured_at: e.secured_at,
      screenshot_url: e.screenshot_url || null,
      blockchain_ref: e.blockchain_ref || null, chain: e.chain || null,
    }))

    if (activeFilter === 'most')  rows = [...rows].sort((a, b) => (b.points??0) - (a.points??0))
    if (activeFilter === 'least') rows = [...rows].sort((a, b) => (a.points??0) - (b.points??0))

    setEntries(rows); setTotal(count || 0)
  }, [activeFilter, page])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Direct flag/clear actions from row buttons (without opening receipt first)
  const handleDirectFlag   = async (entry: EntryRow) => { setActiveEntry({ ...entry, _openModal: 'flag' } as any) }
  const handleDirectClear  = async (entry: EntryRow) => { setActiveEntry({ ...entry, _openModal: 'clear_flag' } as any) }
  const handleDirectRemove = async (entry: EntryRow) => { setActiveEntry({ ...entry, _openModal: 'delete' } as any) }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight leading-tight">
            Entry <span className="text-blue-400">Management</span>
          </h1>
          <p className="text-white/35 text-sm mt-1">View, filter, and moderate all secured entries across the platform.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Total Uptime: <span className="text-white/55 font-mono tracking-tight">{uptime}</span></p>
        </div>
      </div>

      {/* Table header */}
      <div className="grid rounded-xl bg-[#0d1529] mb-1" style={{ gridTemplateColumns: '2.8fr 1fr 1.1fr 2fr' }}>
        {['Entry', 'User', 'Status', 'Control'].map((col) => (
          <div key={col} className="px-4 py-3.5">
            <span className="text-white/70 text-[12px] font-semibold">{col}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      {entries.length === 0
        ? <div className="py-16 text-center"><p className="text-white/20 text-sm">No entries found.</p></div>
        : entries.map((entry, idx) => (
          <div key={entry.id}
            className={`grid items-center py-3.5 hover:bg-white/[0.02] rounded-xl transition-colors ${idx < entries.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
            style={{ gridTemplateColumns: '2.8fr 1fr 1.1fr 2fr' }}>
            {/* Entry */}
            <div className="px-3 flex items-start gap-3 min-w-0 cursor-pointer" onClick={() => setActiveEntry(entry)}>
              <PlatformIcon platform={entry.platform} />
              <div className="min-w-0">
                <p className="text-white/85 text-[13px] font-medium leading-tight truncate">{entry.title}</p>
                {entry.url && <p className="text-white/28 text-[11px] truncate mt-0.5">{entry.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,45)}</p>}
                <p className="text-white/20 text-[10px] mt-0.5">{timeAgo(entry.secured_at)}</p>
              </div>
            </div>
            {/* User */}
            <div className="px-3"><span className="text-white/70 text-[13px]">@{entry.username}</span></div>
            {/* Status */}
            <div className="px-3 flex flex-col gap-1">
              {entry.points !== null && <span className="text-white text-[12px] font-semibold">+{entry.points} Pts</span>}
              <StatusPill status={entry.status} />
            </div>
            {/* Control */}
            <div className="px-3">
              <ControlButtons
                status={entry.status}
                onFlag={()    => setActiveEntry({ ...entry, _openModal: 'flag' } as any)}
                onClear={()   => setActiveEntry({ ...entry, _openModal: 'clear_flag' } as any)}
                onRemove={()  => setActiveEntry({ ...entry, _openModal: 'delete' } as any)}
                onReceipt={() => setActiveEntry(entry)}
              />
            </div>
          </div>
        ))
      }

      <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />

      {/* Modals */}
      {activeEntry && (
        <EntryModalsWrapper
          entry={activeEntry}
          initialModal={(activeEntry as any)._openModal || 'receipt'}
          onClose={() => setActiveEntry(null)}
          onRefresh={fetchEntries}
        />
      )}
    </div>
  )
}

// Wrapper that sets initial modal state
function EntryModalsWrapper({ entry, initialModal, onClose, onRefresh }: {
  entry: EntryRow; initialModal: ModalType; onClose: () => void; onRefresh: () => void
}) {
  const [modal,  setModal]  = useState<ModalType>(initialModal)
  const [reason, setReason] = useState('')

  const confirmFlag = async (r: string) => {
    await supabase.from('entries').update({ status: 'flagged' }).eq('id', entry.id)
    setReason(r); setModal('flag_confirm'); onRefresh()
  }
  const confirmDelete = async (r: string) => {
    await supabase.from('entries').delete().eq('id', entry.id)
    setReason(r); setModal('delete_confirm'); onRefresh()
  }
  const confirmClearFlag = async (note: string) => {
    await supabase.from('entries').update({ status: 'secured' }).eq('id', entry.id)
    setReason(note); setModal('flag_cleared'); onRefresh()
  }

  const close = () => { setModal('none'); onClose() }
  const backToReceipt = () => setModal('receipt')

  if (modal === 'none') return null
  if (modal === 'receipt')        return <ReceiptModal        entry={entry} onClose={close} onFlag={() => setModal('flag')} onClear={() => setModal('clear_flag')} onRemove={() => setModal('delete')} />
  if (modal === 'flag')           return <FlagModal           entry={entry} onClose={backToReceipt} onConfirm={confirmFlag} />
  if (modal === 'flag_confirm')   return <FlaggedConfirmModal entry={entry} reason={reason} onClose={close} />
  if (modal === 'delete')         return <DeleteModal         entry={entry} onClose={backToReceipt} onConfirm={confirmDelete} />
  if (modal === 'delete_confirm') return <DeletedConfirmModal entry={entry} reason={reason} onClose={close} />
  if (modal === 'clear_flag')     return <ClearFlagModal      entry={entry} onClose={backToReceipt} onConfirm={confirmClearFlag} />
  if (modal === 'flag_cleared')   return <FlagClearedModal    entry={entry} note={reason} onClose={close} />
  return null
}