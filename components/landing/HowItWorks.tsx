// components/landing/HowItWorks.tsx — Get started in three simple steps
'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    number: '1',
    title: 'Paste Your Link',
    description: 'Drop in your YouTube, X, Instagram, or any platform URL. Candoxa auto-detects the platform and pulls the metadata.',
  },
  {
    number: '2',
    title: 'Add Context & Screenshot',
    description: 'Write a short title and description. Upload your analytics screenshot showing real engagement — views, reach, impressions.',
  },
  {
    number: '3',
    title: 'Secure to Profile',
    description: 'One click. A stamping animation confirms your entry is locked, timestamped, and anchored to blockchain under your permanent username.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-black py-20 md:py-28 px-5 md:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1">
            <span className="text-blue-400 text-xs font-medium tracking-wide uppercase">How it works</span>
          </div>
        </div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black text-center mb-14 md:mb-20 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Get started in three<br className="md:hidden" /> simple steps
        </motion.h2>

        {/* Steps */}
        <div className="relative">

          {/* Desktop: horizontal line */}
          <div className="hidden md:block absolute top-6 left-1/2 -translate-x-1/2 w-2/3 h-px bg-white/10" />

          {/* Mobile: vertical line */}
          <div className="md:hidden absolute left-[23px] top-8 bottom-8 w-px bg-white/10" />

          {/* Desktop: 3-column grid | Mobile: vertical list */}
          <div className="grid md:grid-cols-3 md:gap-12 relative flex-col gap-0">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex md:flex-col md:items-center md:text-center items-start gap-5 md:gap-0 mb-12 md:mb-0 last:mb-0"
              >
                {/* Number bubble */}
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative z-10 md:mb-6">
                  {step.number}
                </div>

                <div>
                  <h3 className="text-white font-bold text-lg mb-2 md:mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {step.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}