// app/notifications/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

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
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days} days ago`
}

function getGroup(d: string): 'today' | 'yesterday' | 'earlier' {
  const now       = new Date()
  const todayMid  = new Date(now); todayMid.setHours(0,0,0,0)
  const yesterMid = new Date(todayMid); yesterMid.setDate(yesterMid.getDate() - 1)
  const date      = new Date(d)
  if (date >= todayMid)  return 'today'
  if (date >= yesterMid) return 'yesterday'
  return 'earlier'
}

function NotifIcon({ type }: { type: string }) {
  const base = 'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0'
  if (type === 'invite_validated') return (
    <div className={`${base} bg-green-500/15 border border-green-500/25`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
    </div>
  )
  if (type === 'new_tracker') return (
    <div className={`${base} bg-white/[0.07] border border-white/[0.10]`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
    </div>
  )
  if (type === 'invite_joined') return (
    <div className={`${base} bg-white/[0.07] border border-white/[0.10]`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5"/><path d="M19 8v6M22 11h-6"/></svg>
    </div>
  )
  if (type === 'limit_reached') return (
    <div className={`${base} bg-orange-500/15 border border-orange-500/25`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
  )
  return (
    <div className={`${base} bg-white/[0.07] border border-white/[0.10]`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const [user,   setUser]   = useState<any>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      supabase.from('users').select('id').eq('email', session.user.email).single()
        .then(({ data }) => {
          if (!data) return
          supabase.from('notifications').select('*').eq('user_id', data.id)
            .order('created_at', { ascending: false }).limit(50)
            .then(({ data: ns }) => setNotifs(ns || []))
        })
    })
  }, [])

  const markAllRead = async () => {
    const { data: prof } = await supabase.from('users').select('id').eq('email', user.email).single()
    if (!prof) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', prof.id)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const groups: { key: string; label: string; items: Notif[] }[] = [
    { key: 'today',     label: 'TODAY',     items: notifs.filter(n => getGroup(n.created_at) === 'today') },
    { key: 'yesterday', label: 'YESTERDAY', items: notifs.filter(n => getGroup(n.created_at) === 'yesterday') },
    { key: 'earlier',   label: 'EARLIER',   items: notifs.filter(n => getGroup(n.created_at) === 'earlier') },
  ].filter(g => g.items.length > 0)

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>

  return (
    <DashboardLayout user={user}>
      <div className="max-w-[680px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <h1 className="text-white text-[24px] font-bold tracking-tight">Notifications</h1>
          <button onClick={markAllRead} className="text-white/40 text-[13px] hover:text-white/65 transition-colors">
            Mark all as read
          </button>
        </div>

        {/* Empty */}
        {notifs.length === 0 && (
          <p className="text-white/20 text-[13px]">No notifications yet.</p>
        )}

        {/* Grouped */}
        <div className="space-y-7">
          {groups.map((group) => (
            <div key={group.key}>
              {/* Group label */}
              <p className="text-white/35 text-[11px] font-bold tracking-[0.16em] mb-3">{group.label}</p>

              {/* Rows */}
              <div className="space-y-1.5">
                {group.items.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 px-4 py-4 rounded-2xl transition-colors ${!n.read ? 'bg-white/[0.05]' : 'bg-transparent hover:bg-white/[0.02]'}`}
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-[13px] leading-snug">{n.message}</p>
                      {n.subtitle && (
                        n.type === 'limit_reached'
                          ? <button onClick={() => router.push('/settings')} className="text-[12px] font-semibold mt-1" style={{ color: '#0038FF' }}>{n.subtitle}</button>
                          : <p className="text-white/35 text-[12px] mt-0.5">{n.subtitle}</p>
                      )}
                    </div>
                    <span className="text-white/25 text-[11px] flex-shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}