// components/landing/Problem.tsx — The Problem section
'use client'

import { motion } from 'framer-motion'

const problems = [
  {
    icon: '✦',
    title: 'Work Gets Erased',
    description: 'Platforms delete, shadowban, and update. The video you made that hit 2M views? Gone with the platform\'s algorithm.',
  },
  {
    icon: '⊡',
    title: "Screenshots Aren't Proof",
    description: 'Anyone can edit a screenshot. Without a verifiable timestamp, your analytics are just an image file on your phone.',
  },
  {
    icon: '⊗',
    title: 'No Portable Record',
    description: 'Platforms delete, shadowban, and update. The video you made that hit 2M views? Gone with the platform\'s algorithm.',
  },
]

export default function Problem() {
  return (
    <section className="bg-black py-28 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Top — text + mock disabled screen */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1 mb-6">
              <span className="text-blue-400 text-xs font-medium">The Problem</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
              Your work disappears.
              <br />
              Your credit shouldn't.
            </h2>

            <p className="text-white/50 mt-4 text-base leading-relaxed max-w-md">
              Platforms delete posts. Screenshots get disputed. Viral moments vanish. You built something real, but you can't prove it.
            </p>
          </motion.div>

          {/* Mock — disabled account screen */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[#0D0D1F] border border-white/10 rounded-2xl p-8"
          >
            <h3 className="text-white text-xl font-bold text-center mb-2">We've disabled your account</h3>
            <p className="text-white/40 text-sm text-center mb-1">You no longer have access to candoxa_</p>
            <p className="text-white/30 text-xs text-center mb-6">Account disabled on 18 February 2026</p>
            <div className="border-t border-white/5 pt-4">
              <p className="text-white/20 text-sm text-center">Why this happened</p>
            </div>
          </motion.div>
        </div>

        {/* Bottom — 3 pain point cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6"
            >
              <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-blue-400 text-lg">{p.icon}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                {p.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{p.description}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}