// components/landing/Navbar.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Navbar() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 py-4 bg-black/60 backdrop-blur border-b border-white/[0.06]">

        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Candoxa"
          width={110}
          height={32}
          className="object-contain cursor-pointer"
          onClick={() => router.push('/')}
          priority
        />

        {/* Desktop Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            How it works
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Features
          </button>
          <button className="text-white/60 hover:text-white text-sm transition-colors">
            FAQ
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm font-semibold px-4 py-2 md:px-5 md:py-2.5 rounded-full"
          >
            Get Started
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-px bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-5 h-px bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div
        className={`fixed top-[61px] left-0 right-0 z-40 bg-black/95 backdrop-blur border-b border-white/[0.06] transition-all duration-300 md:hidden overflow-hidden ${
          menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col px-6 py-4 gap-5">
          <button
            onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
              setMenuOpen(false)
            }}
            className="text-white/70 text-base text-left"
          >
            How it works
          </button>
          <button
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              setMenuOpen(false)
            }}
            className="text-white/70 text-base text-left"
          >
            Features
          </button>
          <button className="text-white/70 text-base text-left">
            FAQ
          </button>
        </div>
      </div>
    </>
  )
}