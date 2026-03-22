// components/landing/MadeFor.tsx — Made for You, Who've Earned It section
'use client'

import { motion } from 'framer-motion'

const audiences = [
  {
    title: 'Creators',
    description: "You've written viral threads, published long-form takes, and built real audiences — only to watch platforms bury your work, change their algorithms, or disappear your reach overnight.",
  },
  {
    title: 'Founders',
    description: "You've launched products, built in public, and documented your journey, but when it comes to raising, partnering, or hiring, none of it is portable.",
  },
  {
    title: 'Developers',
    description: "You've shipped open-source libraries, written technical posts, and solved hard problems in public, but a GitHub profile only tells half the story.",
  },
  {
    title: 'Operators',
    description: "You've published findings, shared early hypotheses, and contributed to public knowledge — only to see your work miscredited, republished without attribution, or simply forgotten.",
  },
  {
    title: 'Researchers',
    description: 'You run the operations, write the playbooks, and build the processes that make companies work, but the credit rarely travels. Candoxa gives operators a permanent record of strategy.',
  },
]

export default function MadeFor() {
  return (
    <section className="bg-black py-28 px-6">
      <div className="max-w-7xl mx-auto">

        <div className="grid md:grid-cols-3 gap-6 items-start">

          {/* Left label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-1"
          >
            <div className="inline-flex bg-blue-900/40 border border-blue-500/30 rounded-full px-4 py-1 mb-6">
              <span className="text-blue-400 text-xs font-medium">Who It's for</span>
            </div>
            <h2 className="text-4xl font-black leading-tight mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Made for You.
              <br />
              Who've Earned It
            </h2>
            <a href="#" className="text-white/50 text-sm hover:text-white transition-colors">
              And you? Start building. →
            </a>
          </motion.div>

          {/* Right — audience cards grid */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {audiences.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-6 hover:border-blue-500/30 transition-colors"
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-blue-400">✦</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {a.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {a.description}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}