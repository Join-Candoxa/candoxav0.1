'use client'

import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Problem from '@/components/landing/Problem'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Clarity from '@/components/landing/Clarity'
import MadeFor from '@/components/landing/MadeFor'
import Newsletter from '@/components/landing/Newsletter'

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <Hero />
      <Problem />
      <Features />
      <HowItWorks />
      <Clarity />
      <MadeFor />
      <Newsletter />
    </main>
  )
}