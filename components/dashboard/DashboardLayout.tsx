// components/dashboard/DashboardLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import NotificationsDropdown from './NotificationsDropdown'

export default function DashboardLayout({ children, user }: { children: React.ReactNode; user: any }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [profile,     setProfile]     = useState<any>(null)

  useEffect(() => {
    if (!user?.email) return

    const init = async () => {
      // If this email belongs to an admin, kick them out of the user dashboard
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (adminRow) {
        router.replace('/admin/dashboard')
        return
      }

      const { data } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .eq('email', user.email)
        .single()

      setProfile(data)
    }

    init()
  }, [user])

  const initials = (profile?.username || user?.email || 'U')[0].toUpperCase()
  const palette  = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const avatarBg = palette[initials.charCodeAt(0) % palette.length]

  return (
    <div className="h-screen overflow-hidden bg-[#060608] flex flex-col">

      {/* ── Topbar — desktop only ── */}
      <div className="hidden md:flex h-[64px] bg-[#0A0A0F] border-b border-white/[0.06] items-center px-5 gap-5 flex-shrink-0 w-full z-50">

        <div className="w-[220px] flex items-center gap-2.5 flex-shrink-0">
          <Image src="/logo.png" alt="Candoxa" width={110} height={32} className="object-contain flex-shrink-0" priority />
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-[20px] bg-white/[0.05] border border-white/[0.08] rounded-full px-4"
            style={{ width:'316px', height:'40px' }}>
            <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Type to search"
              className="bg-transparent text-white/60 text-[13px] outline-none flex-1 placeholder-white/30" />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <button onClick={() => setShowNotifs(v => !v)}
              className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.07] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
              <Image src="/icons/notifs.png" alt="Notifications" width={18} height={18} className="brightness-0 invert opacity-60" />
            </button>
            {showNotifs && profile?.id && (
              <NotificationsDropdown userId={profile.id} onClose={() => setShowNotifs(false)} />
            )}
          </div>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
            : <div className={`w-9 h-9 rounded-full flex items-center justify-center ${avatarBg}`}>
                <span className="text-white text-[13px] font-bold">{initials}</span>
              </div>
          }
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className="hidden md:flex">
          <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </div>

      <div className="md:hidden">
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
      </div>
    </div>
  )
}