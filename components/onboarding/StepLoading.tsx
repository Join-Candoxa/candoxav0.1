// components/onboarding/StepLoading.tsx
'use client'

import { useEffect } from 'react'

export default function StepLoading({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center px-5">
      <div
        className="w-full max-w-xs flex flex-col items-center text-center"
        style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '40px 32px', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Spinning ring */}
        <div
          className="w-16 h-16 rounded-full mb-6"
          style={{
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: 'rgba(255,255,255,0.7)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <h2 className="text-white font-bold text-[20px] leading-snug mb-2">
          Setting up your permanent identity…
        </h2>
        <p className="text-[#6B8AFF] text-[14px]">Securing your foundation.</p>
      </div>
    </div>
  )
}