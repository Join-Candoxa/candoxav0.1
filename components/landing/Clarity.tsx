// components/landing/Clarity.tsx — Clarity over complexity / Trust layer section
'use client'

import { motion } from 'framer-motion'

const points = [
  {
    title: 'No wallet setup required',
    description: 'Sign in with Google. We create your on-chain account automatically.',
  },
  {
    title: 'Every entry is timestamped',
    description: 'The exact date and block reference are locked in — impossible to alter retroactively.',
  },
  {
    title: 'Advanced users can export',
    description: 'Access your wallet and seed phrase anytime from account settings.',
  },
  {
    title: 'Human-readable verification',
    description: 'Anyone can verify an entry without knowing anything about blockchain.',
  },
]

const receiptRows = [
  { label: 'Entry', value: '1M Sub Breakdown' },
  { label: 'Creator', value: '@mkavinsky' },
  { label: 'Platform', value: 'YouTube' },
  { label: 'Secured On', value: 'Feb 20, 2026 · 09:14 UTC' },
  { label: 'Status', value: '● Secured · Indelible', highlight: true },
  { label: 'Blockchain Ref', value: '0x4f3c2a1b9d8e...' },
  { label: 'Chain', value: 'Base · Block #18,442,901' },
]

export default function Clarity() {
  return (
    <section className="bg-black py-20 md:py-28 px-5 md:px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">

        {/* Left — text */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1 mb-5 md:mb-6">
            <span className="text-blue-400 text-xs font-medium">Trust Layer</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4 md:mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
            Clarity over
            <br />
            complexity
          </h2>

          <p className="text-white/50 text-sm leading-relaxed mb-8 md:mb-10">
            We handle the on-chain side so you don't have to think about it. No wallets, no seed phrases. Just a permanent, verifiable record of what you've built.
          </p>

          <div className="space-y-5 md:space-y-6">
            {points.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="mt-0.5 w-5 h-5 rounded-full border border-blue-500/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 text-xs">✓</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{p.title}</p>
                  <p className="text-white/40 text-sm leading-relaxed">{p.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right — blockchain receipt card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-[#0D0D1F] border border-white/10 rounded-2xl overflow-hidden"
        >
          {/* Card header */}
          <div className="px-6 md:px-8 py-5 md:py-6 border-b border-white/5 text-center">
            <p className="text-white font-bold text-base md:text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>
              Human-Readable Receipt
            </p>
            <p className="text-blue-400 text-xs mt-1">Secured Entry · Blockchain Verified</p>
          </div>

          {/* Receipt rows */}
          <div className="px-6 md:px-8 py-2">
            {receiptRows.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3.5 md:py-4 border-b border-white/5 last:border-0"
              >
                <span className="text-sm text-blue-400/70">
                  {row.label}
                </span>
                <span className={`text-xs md:text-sm font-medium text-right max-w-[55%] ${row.highlight ? 'text-green-400' : 'text-white/80'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}