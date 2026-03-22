// components/dashboard/NotificationsDropdown.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface Notif {
  id: string
  type: string
  message: string
  subtitle: string | null
  read: boolean
  created_at: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}h ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'invite_validated') return (
    <div className="w-8 h-8 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
    </div>
  )
  if (type === 'new_tracker') return (
    <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
    </div>
  )
  if (type === 'invite_joined') return (
    <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5"/><path d="M19 8v6M22 11h-6"/></svg>
    </div>
  )
  if (type === 'limit_reached') return (
    <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
  )
  // default bell
  return (
    <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    </div>
  )
}

export default function NotificationsDropdown({ userId, onClose }: { userId: string; onClose: () => void }) {
  const router = useRouter()
  const ref    = useRef<HTMLDivElement>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])

  useEffect(() => {
    supabase.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setNotifs(data || []))
  }, [userId])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div ref={ref}
      className="absolute top-[52px] right-0 w-[340px] bg-[#0e0e14] border border-white/[0.10] rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <p className="text-white font-semibold text-[14px]">Notifications</p>
        <button onClick={markAllRead} className="text-white/35 text-[11px] hover:text-white/60 transition-colors">
          Mark all as read
        </button>
      </div>

      {/* Notif list */}
      <div className="max-h-[360px] overflow-y-auto">
        {notifs.length === 0 ? (
          <p className="text-white/25 text-[12px] text-center py-8">No notifications yet.</p>
        ) : (
          notifs.map((n) => (
            <div key={n.id}
              className={`flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.05] last:border-0 transition-colors ${!n.read ? 'bg-white/[0.03]' : ''}`}>
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-[12px] leading-snug">{n.message}</p>
                {n.subtitle && (
                  n.type === 'limit_reached'
                    ? <button onClick={() => { router.push('/settings'); onClose() }} className="text-[11px] font-semibold mt-0.5" style={{ color: '#0038FF' }}>{n.subtitle}</button>
                    : <p className="text-white/35 text-[11px] mt-0.5">{n.subtitle}</p>
                )}
              </div>
              <span className="text-white/25 text-[10px] flex-shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.07]">
        <button
          onClick={() => { router.push('/notifications'); onClose() }}
          className="w-full text-center text-white/45 text-[12px] hover:text-white/70 transition-colors"
        >
          View All Notifications
        </button>
      </div>
    </div>
  )
}