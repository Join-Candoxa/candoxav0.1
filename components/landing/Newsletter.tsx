// components/landing/Newsletter.tsx — Final CTA / newsletter subscribe section
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!email) return
    setSubmitted(true)
  }

  return (
    <section className="relative bg-black py-28 px-6 overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-900/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1 mb-8"
        >
          <span className="text-blue-400 text-xs font-medium">Let's keep you updated</span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-black leading-tight mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Your Work Happened.
          <br />
          Now Make the World Prove It
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-white/50 text-sm leading-relaxed mb-10"
        >
          Join the first 500 creators building a permanent identity on Candoxa.
          <br />
          Early members get priority access and an exclusive Early Builder badge.
        </motion.p>

        {/* Input + Button */}
        {!submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm px-5 py-3 rounded-full outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium text-sm px-6 py-3 rounded-full whitespace-nowrap"
            >
              Subscribe to Newsletter
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-900/30 border border-blue-500/30 rounded-2xl px-8 py-5 max-w-md mx-auto mb-4"
          >
            <p className="text-blue-300 font-semibold">🎉 You're on the list!</p>
            <p className="text-white/50 text-sm mt-1">We'll reach out when early access opens.</p>
          </motion.div>
        )}

        <p className="text-white/25 text-xs">
          No spam. No obligations. Unsubscribe anytime. First 500 get priority access + Early Builder badge.
        </p>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-white/20 text-xs">
          <span>© 2026 Candoxa</span>
          <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
          <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
        </div>

      </div>
    </section>
  )
}