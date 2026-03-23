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
  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [profile,        setProfile]        = useState<any>(null)

  useEffect(() => {
    supabase.from('users').select('id, username, avatar_url').eq('email', user.email).single()
      .then(({ data }) => setProfile(data))
  }, [user])

  const initials  = (profile?.username || user?.email || 'U')[0].toUpperCase()
  const palette   = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const avatarBg  = palette[initials.charCodeAt(0) % palette.length]

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col">

      {/* ── Full-width topbar — sits above everything including sidebar ── */}
      <div className="h-[64px] bg-[#0A0A0F] border-b border-white/[0.06] flex items-center px-5 gap-5 sticky top-0 z-50 w-full">

        {/* Logo area — same width as sidebar */}
        <div className="w-[220px] flex items-center gap-2.5 flex-shrink-0">
          {/* Mobile hamburger */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-white/60 hover:text-white mr-1">
            <div className="w-4 h-0.5 bg-current mb-1" /><div className="w-4 h-0.5 bg-current mb-1" /><div className="w-4 h-0.5 bg-current" />
          </button>
          <Image src="/logo.png" alt="Candoxa" width={110} height={32} className="object-contain flex-shrink-0" priority />
        </div>

        {/* Search — 316×40, centered */}
        <div className="flex-1 flex justify-center">
          <div
            className="flex items-center gap-[20px] bg-white/[0.05] border border-white/[0.08] rounded-full px-4"
            style={{ width: '316px', height: '40px' }}
          >
            <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Type to search"
              className="bg-transparent text-white/60 text-[13px] outline-none flex-1 placeholder-white/30"
            />
          </div>
        </div>

        {/* Right — notifs + avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.07] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
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

      {/* ── Body — sidebar + content ── */}
      <div className="flex flex-1">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed left-0 top-[64px] h-[calc(100vh-64px)] z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:h-auto`}>
          <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Page content */}
        <div className="flex-1 md:ml-0 p-6 min-w-0 pb-24 md:pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}