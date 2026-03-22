// components/admin/AdminLayout.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const navItems = [
  { label: 'Analytics',      icon: '/icons/analytics.png',    path: '/admin/dashboard' },
  { label: 'Users',          icon: '/icons/users.png',         path: '/admin/users' },
  { label: 'Entries',        icon: '/icons/lock.png',          path: '/admin/entries' },
  { label: 'Flagged',        icon: '/icons/flagged.png',       path: '/admin/flagged' },
  { label: 'Points Control', icon: '/icons/coin.png',          path: '/admin/points' },
  { label: 'Transactions',   icon: '/icons/transactions.png',  path: '/admin/transactions' },
  { label: 'Announcements',  icon: '/icons/announcement.png',  path: '/admin/announcements' },
  { label: 'Logs',           icon: '/icons/logs.png',          path: '/admin/logs' },
  { label: 'Settings',       icon: '/icons/setting.png',       path: '/admin/settings' },
]

interface AdminLayoutProps {
  children: React.ReactNode
  activePage: string
  /** Optional content injected into the right side of the topbar (e.g. filter buttons) */
  topbarRight?: React.ReactNode
}

export default function AdminLayout({ children, activePage, topbarRight }: AdminLayoutProps) {
  const router   = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">

      {/* ── Sidebar ── */}
      <aside className="w-[220px] min-h-screen bg-[#0A0A0F] border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-20">

        {/* Super Admin pill + Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex flex-col items-start gap-2.5">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2.5 py-[3px] rounded-full border border-blue-500/60 bg-blue-500/[0.12] text-blue-400 leading-none">
              Super Admin
            </span>
            <Image
              src="/logo.png"
              alt="Candoxa"
              width={115}
              height={34}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium
                  transition-all duration-150 text-left
                  ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/25'
                    : 'text-white/55 hover:text-white/80 hover:bg-white/[0.05]'
                  }
                `}
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={15}
                  height={15}
                  className={`flex-shrink-0 transition-all duration-150 ${
                    active ? 'brightness-0 invert' : 'invert opacity-55'
                  }`}
                />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-5 border-t border-white/[0.05]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <Image
              src="/icons/logout.png"
              alt="Logout"
              width={15}
              height={15}
              className="opacity-70 invert flex-shrink-0"
            />
            LogOut
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">

        {/* Topbar — search left, optional right slot for page-specific controls */}
        <div className="sticky top-0 z-10 bg-[#0A0A0F] border-b border-white/[0.07]">
          <div className="flex items-center justify-between px-8 py-4 gap-6">
            {/* Search — short underline style */}
            <div className="flex items-center gap-3 w-[300px] border-b border-blue-500/40 pb-1.5 flex-shrink-0">
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 bg-transparent text-white/60 text-sm placeholder-white/25 outline-none"
              />
              <span className="text-white/20 text-[11px] font-mono tracking-widest flex-shrink-0 select-none">
                ⌥ ⌘ S
              </span>
            </div>
            {/* Right slot */}
            {topbarRight && (
              <div className="flex items-center gap-0 flex-shrink-0">
                {topbarRight}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 px-8 py-6">
          {children}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-white/[0.05] flex items-center justify-center gap-10">
          <span className="text-white/20 text-[11px]">Candoxa Admin v1.2</span>
          <span className="text-white/20 text-[11px]">Encrypted Session</span>
          <span className="text-white/20 text-[11px]">All Access Logged</span>
        </div>
      </div>
    </div>
  )
}