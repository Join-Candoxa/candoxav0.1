// components/landing/Navbar.tsx
'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Navbar() {
  const router = useRouter()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-black/60 backdrop-blur border-b border-white/[0.06]">

      {/* Logo */}
      <Image
        src="/logo.png"
        alt="Candoxa"
        width={120}
        height={36}
        className="object-contain cursor-pointer"
        onClick={() => router.push('/')}
        priority
      />

      {/* Nav links */}
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

      {/* CTA */}
      <button
        onClick={() => router.push('/onboarding')}
        className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-full"
      >
        Get Started
      </button>
    </nav>
  )
}