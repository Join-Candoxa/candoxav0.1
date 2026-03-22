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
          backgroundPosition: 'center',
          opacity: 0.85,
        }}
      />

      {/* Mobile: bottom fade overlay */}
      <div
        className="absolute inset-0 pointer-events-none md:hidden"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 80%, black 100%)' }}
      />

      {/* Desktop: left fade */}
      <div className="absolute inset-0 pointer-events-none hidden md:block"
        style={{ background: 'linear-gradient(to right, black 20%, transparent 60%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-6 w-full grid md:grid-cols-2 gap-4 items-center py-16 md:py-20 relative z-10">

        {/* Left / Main — Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5 md:mb-6">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-white/70 text-xs">Trusted Identity Infrastructure</span>
          </div>

          <h1 className="text-[2.6rem] leading-[1.1] md:text-6xl font-bold mb-5 md:mb-6 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Your Work Deserves a<br />
            Home That{' '}
            <span className="text-blue-500">Lasts Forever</span>
          </h1>

          <p className="text-white/60 text-sm md:text-base leading-relaxed mb-7 md:mb-8 max-w-md">
            Candoxa is the permanent identity layer for creators. Secure your achievements on-chain, share your record, and let your work speak for itself — forever.
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3 mb-7 md:mb-8 flex-wrap">
            <button
              onClick={() => router.push('/onboarding')}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold text-sm px-5 py-3 rounded-full"
            >
              Claim Your Identity
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-white/30 hover:border-white/50 transition-colors text-white font-medium text-sm px-5 py-3 rounded-full"
            >
              See how it works
            </button>
          </div>

          {/* Avatar strip */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#3B5BDB','#4263EB','#5C7CFA','#748FFC','#91A7FF'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span className="text-white/50 text-xs md:text-sm">Joined by 400+ creators in early access</span>
          </div>
        </motion.div>

        {/* Right — Cards (desktop only full, mobile shows preview card below) */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex flex-col gap-4 md:gap-4 mt-10 md:mt-0"
          style={{ marginRight: window?.innerWidth >= 768 ? '-120px' : '0' }}
        >
          {/* Back card — bright blue (desktop only) */}
          <div
            className="hidden md:block rounded-2xl p-6"
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

          {/* Front / Mobile card */}
          <div
            className="rounded-2xl p-5 md:p-6 shadow-2xl"
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
              <div className="ml-auto bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-3 py-1 rounded-full">Secured</div>
            </div>

            <p className="text-white font-bold text-sm md:text-base mb-1">How I Grew to 1M Subscribers in 18 Months</p>
            <p className="text-white/50 text-xs md:text-sm leading-relaxed mb-4 md:mb-5">
              Full breakdown of strategy, posting cadence, and the one video that changed everything. 1,040,000 views documented.
            </p>

            {/* Thumbnail strip */}
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex-1 h-12 md:h-14 rounded-lg" style={{ background: i === 1 ? '#3B5BDB' : i % 2 === 0 ? '#2d4bc0' : '#4263eb' }} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">@mkavinsky · Secured Feb 20, 2026 · Timestamped</span>
              <button className="hidden md:block border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                Identify ↗
              </button>
            </div>
          </div>

          {/* Secured by Privy — desktop only */}
          <div className="hidden md:flex justify-center items-center gap-2">
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