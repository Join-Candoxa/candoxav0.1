// components/dashboard/Sidebar.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const navItems = [
  { label: 'Dashboard',  icon: '/icons/home.png',     path: '/dashboard' },
  { label: 'My Profile', icon: '/icons/user.png',     path: '/profile'   },
  { label: 'Secured',    icon: '/icons/secured.png',  path: '/secured'   },
  { label: 'Discover',   icon: '/icons/discover.png', path: '/discover'  },
  { label: 'Growth',     icon: '/icons/growth.png',   path: '/growth'    },
  { label: 'Settings',   icon: '/icons/setting.png',  path: '/settings'  },
]

export default function Sidebar({ user, onClose }: { user: any; onClose?: () => void }) {
  const router   = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/onboarding')
  }

  const navigate = (path: string) => {
    router.push(path)
    onClose?.()
  }

  return (
    <div className="w-[220px] h-full bg-[#0A0A0F] border-r border-white/[0.06] flex flex-col">

      {/* Nav */}
      <nav className="flex-1 px-3 pt-5 pb-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium
                transition-all duration-150 text-left
                ${active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'
                }
              `}
            >
              <Image
                src={item.icon}
                alt={item.label}
                width={16}
                height={16}
                className={`flex-shrink-0 transition-all duration-150 ${
                  active ? 'brightness-0 invert' : 'brightness-0 invert opacity-55'
                }`}
              />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Logout — red text + logout icon tinted red */}
      <div className="px-3 py-4 border-t border-white/[0.05]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150"
        >
          <Image
            src="/icons/logout.png"
            alt="Logout"
            width={16}
            height={16}
            className="flex-shrink-0"
            style={{ filter: 'invert(40%) sepia(80%) saturate(600%) hue-rotate(320deg) opacity(0.7)' }}
          />
          Logout
        </button>
      </div>
    </div>
  )
}