// components/landing/Hero.tsx — Landing page hero section
'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Hero() {
  const router = useRouter()

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black pt-16">

      {/* Background image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          opacity: 0.85,
        }}
      />

      {/* Left fade */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, black 20%, transparent 60%)' }}
      />

      <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-4 items-center py-20 relative z-10">

        {/* Left — Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-white/70 text-xs">Permanent Identity On Chain</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-white">
            Digital Identity
            <br />
            Onchain{' '}
            <span className="text-blue-500">Forever</span>
          </h1>

          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
            Document your profile once. Prove them forever. Candoxa creates an immutable, professional record of everything you've built.
          </p>

          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/onboarding')}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium px-6 py-3 rounded-full"
            >
              Secure your Identity
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-white/30 hover:border-white/50 transition-colors text-white font-medium px-6 py-3 rounded-full"
            >
              How It Works
            </button>
          </div>

          {/* Avatar strip */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#3B5BDB','#4263EB','#5C7CFA','#748FFC','#91A7FF'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span className="text-white/50 text-sm">Joined by 400+ creators in early access</span>
          </div>
        </motion.div>

        {/* Right — Cards */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden md:flex flex-col gap-4"
          style={{ marginRight: '-120px' }}
        >
          {/* Back card — bright blue */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1d3ab8 0%, #2350d4 50%, #1a44cc 100%)',
              border: '1px solid rgba(100,140,255,0.3)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <span className="text-white/90 text-sm font-semibold">YouTube</span>
            </div>
            <p className="text-white font-bold text-base mb-2">How I Grew to 1M Subscribers in 18 Months</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Full breakdown of strategy, posting cadence, and the one video that changed everything. 1,040,000 views documented.
            </p>
          </div>

          {/* Front card — dark */}
          <div
            className="rounded-2xl p-6 shadow-2xl"
            style={{
              background: '#0c0f1d',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <span className="text-white/80 text-sm font-medium">YouTube</span>
              <div className="ml-auto border border-white/20 text-white/50 text-xs px-3 py-1 rounded-full">Secured</div>
            </div>

            <p className="text-white font-bold text-base mb-1">How I Grew to 1M Subscribers in 18 Months</p>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Full breakdown of strategy, posting cadence, and the one video that changed everything. 1,040,000 views documented.
            </p>

            {/* Thumbnail strip */}
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex-1 h-14 rounded-lg" style={{ background: i === 1 ? '#3B5BDB' : i % 2 === 0 ? '#2d4bc0' : '#4263eb' }} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">@mkavinsky · Secured Feb 20, 2026 · Timestamped</span>
              <button className="border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                Identify ↗
              </button>
            </div>
          </div>

          {/* Secured by Privy */}
          <div className="flex justify-center items-center gap-2">
            <span className="text-white/30 text-xs">Secured by</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </div>
              <span className="text-white/50 text-xs font-semibold">privy</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}