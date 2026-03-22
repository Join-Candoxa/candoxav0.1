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
    <section id="how-it-works" className="bg-black py-28 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1">
            <span className="text-blue-400 text-xs font-medium">How it works</span>
          </div>
        </div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black text-center mb-20"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Get started in three simple steps
        </motion.h2>

        {/* Steps */}
        <div className="relative">

          {/* Connecting line */}
          <div className="hidden md:block absolute top-6 left-1/2 -translate-x-1/2 w-2/3 h-px bg-white/10" />

          <div className="grid md:grid-cols-3 gap-12 relative">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                {/* Number bubble */}
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg mb-6 relative z-10">
                  {step.number}
                </div>

                <h3 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {step.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}