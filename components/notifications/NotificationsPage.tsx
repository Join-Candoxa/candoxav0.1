// components/notifications/NotificationsPage.tsx — Notifications list
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const iconMap: Record<string, string> = {
  invite_validated: '✅',
  tracker_new: '👤',
  invite_used: '👥',
  limit_reached: '⚠️',
  platform_update: '🔔',
}

export default function NotificationsPage({ user }: { user: any }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: p } = await supabase.from('users').select('*').eq('email', user.email).single()
      setProfile(p)
      if (p) {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', p.id)
          .order('created_at', { ascending: false })
        setNotifications(data || [])
      }
    }
    fetchNotifs()
  }, [user])

  const markAllRead = async () => {
    if (!profile) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id)
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const groupByDate = (notifs: any[]) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const groups: Record<string, any[]> = { TODAY: [], YESTERDAY: [], EARLIER: [] }
    notifs.forEach((n) => {
      const d = new Date(n.created_at)
      if (d >= today) groups.TODAY.push(n)
      else if (d >= yesterday) groups.YESTERDAY.push(n)
      else groups.EARLIER.push(n)
    })
    return groups
  }

  const groups = groupByDate(notifications)

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days} days ago`
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <button onClick={markAllRead} className="text-white/40 text-sm hover:text-white transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-12 text-center">
          <p className="text-white/30 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([group, notifs]) =>
            notifs.length > 0 ? (
              <div key={group}>
                <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">{group}</p>
                <div className="space-y-2">
                  {notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`bg-[#0A0A0F] border rounded-2xl px-5 py-4 flex items-start justify-between transition-colors ${
                        n.read ? 'border-white/5' : 'border-white/10 bg-blue-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{iconMap[n.type] || '🔔'}</span>
                        <div>
                          <p className="text-white text-sm">{n.message}</p>
                          {n.sub_message && <p className="text-white/40 text-xs mt-0.5">{n.sub_message}</p>}
                        </div>
                      </div>
                      <span className="text-white/30 text-xs shrink-0 ml-4">{timeAgo(n.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}