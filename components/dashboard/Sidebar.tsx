// components/dashboard/Sidebar.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const navItems = [
  { label: 'Dashboard',  icon: '/icons/home.png',    path: '/dashboard' },
  { label: 'My Profile', icon: '/icons/user.png',    path: '/profile'   },
  { label: 'Secured',    icon: '/icons/secured.png', path: '/secured'   },
  { label: 'Discover',   icon: '/icons/discover.png',path: '/discover'  },
  { label: 'Growth',     icon: '/icons/growth.png',  path: '/growth'    },
  { label: 'Messages',   icon: '',                   path: '/messages', svgIcon: true },
  { label: 'Settings',   icon: '/icons/setting.png', path: '/settings'  },
]

// Mobile nav restores Profile, no Messages item
const mobileNavItems = [
  { label: 'Home',     icon: '/icons/home.png',    path: '/dashboard' },
  { label: 'Discover', icon: '/icons/discover.png',path: '/discover'  },
  { label: 'Growth',   icon: '/icons/growth.png',  path: '/growth'    },
  { label: 'Profile',  icon: '/icons/user.png',    path: '/profile'   },
]

function DesktopMsgIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"
      style={{ color: active ? 'white' : 'rgba(255,255,255,0.55)' }}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

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
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-[220px] h-full bg-[#0A0A0F] border-r border-white/[0.06] flex-col">
        <nav className="flex-1 px-3 pt-5 pb-4 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.path || pathname.startsWith(item.path + '/')
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-left
                  ${active ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'}`}>
                {item.svgIcon
                  ? <DesktopMsgIcon active={active} />
                  : <Image src={item.icon} alt={item.label} width={16} height={16}
                      className={`flex-shrink-0 transition-all duration-150 ${active ? 'brightness-0 invert' : 'brightness-0 invert opacity-55'}`} />
                }
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.05]">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150">
            <Image src="/icons/logout.png" alt="Logout" width={16} height={16} className="flex-shrink-0"
              style={{ filter:'invert(40%) sepia(80%) saturate(600%) hue-rotate(320deg) opacity(0.7)' }} />
            Logout
          </button>
        </div>
      </div>

      {/* ── Mobile bottom nav — Profile restored, Messages removed ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0F] border-t border-white/[0.06] flex items-center justify-around px-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>

        {mobileNavItems.slice(0, 2).map((item) => {
          const active = pathname === item.path
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 px-3 py-2 flex-1">
              <Image src={item.icon} alt={item.label} width={22} height={22}
                style={active
                  ? { filter:'drop-shadow(0 0 6px #0038FF) invert(27%) sepia(99%) saturate(7496%) hue-rotate(220deg) brightness(110%)' }
                  : { filter:'brightness(0) invert(1)', opacity:0.4 }} />
              <span className="text-[10px] font-medium" style={{ color: active ? '#0038FF' : 'rgba(255,255,255,0.4)' }}>
                {item.label}
              </span>
            </button>
          )
        })}

        {/* Center + button */}
        <button onClick={() => navigate('/secured')} className="flex flex-col items-center justify-center flex-shrink-0 -mt-5 px-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:'linear-gradient(287.32deg, #0038FF 0.21%, #002093 37.04%, #010103 86.23%)', boxShadow:'0 0 24px rgba(0,56,255,0.5)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="w-7 h-7">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </button>

        {mobileNavItems.slice(2).map((item) => {
          const active = pathname === item.path || pathname.startsWith(item.path + '/')
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 px-3 py-2 flex-1">
              <Image src={item.icon} alt={item.label} width={22} height={22}
                style={active
                  ? { filter:'drop-shadow(0 0 6px #0038FF) invert(27%) sepia(99%) saturate(7496%) hue-rotate(220deg) brightness(110%)' }
                  : { filter:'brightness(0) invert(1)', opacity:0.4 }} />
              <span className="text-[10px] font-medium" style={{ color: active ? '#0038FF' : 'rgba(255,255,255,0.4)' }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}