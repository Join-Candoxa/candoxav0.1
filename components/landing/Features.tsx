// components/landing/Features.tsx — Every feature built for permanence
'use client'

import { motion } from 'framer-motion'

const tags = ['Blockchain', 'Sharable', 'Time stamped', 'Indelible']

const securedEntries = [
  { icon: '▶', color: 'bg-red-600', label: '1M Sub Breakdown' },
  { icon: 'X', color: 'bg-black border border-white/20', label: 'Viral Thread · 4.2M impr.' },
  { icon: '●', color: 'bg-gradient-to-br from-pink-500 to-purple-600', label: 'Documentary Launch' },
]

export default function Features() {
  return (
    <section id="features" className="bg-black py-28 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black text-center mb-16"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Every feature built for permanence.
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Card 1 — Human-Readable Receipts (large) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-8 md:col-span-2 grid md:grid-cols-2 gap-8 items-center"
          >
            <div>
              <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-blue-400">✦</span>
              </div>
              <h3 className="text-white text-2xl font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
                Human-Readable Receipts
              </h3>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                Every secured entry generates a plain-English receipt: who secured it, when, what platform, and the on-chain reference. Verifiable by anyone, readable by everyone. No blockchain knowledge required.
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="bg-blue-900/30 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Secured entries list */}
            <div>
              <p className="text-white font-semibold mb-4">Secured Entries</p>
              <div className="space-y-3">
                {securedEntries.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 ${entry.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>
                        {entry.icon}
                      </div>
                      <span className="text-white/80 text-sm">{entry.label}</span>
                    </div>
                    <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">Input Value</span>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs text-center mt-3">All entries locked · Reverse chronological</p>
            </div>
          </motion.div>

          {/* Card 2 — Permanent Username */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-8"
          >
            <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
              <span className="text-blue-400">👤</span>
            </div>
            <h3 className="text-white text-2xl font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              Permanent Username
            </h3>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              One username. One identity. Every entry you secure is tied to it — forever. Share your Candoxa link like a portfolio URL, but one brands and agencies can actually verify.
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="bg-blue-900/30 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/20">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Card 3 — Track & Discover */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-8"
          >
            <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
              <span className="text-blue-400">◎</span>
            </div>
            <h3 className="text-white text-2xl font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              Track & Discover
            </h3>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Track profiles you want to follow. See new secured entries from creators you care about in the Tracking feed. No algorithm, no ranking — just reverse chronological truth.
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="bg-blue-900/30 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/20">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}