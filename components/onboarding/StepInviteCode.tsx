// components/onboarding/StepInviteCode.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OnboardingData } from '@/app/onboarding/page'

type Props = {
  data:                OnboardingData
  setData:             (d: OnboardingData) => void
  onNext:              () => void
  onAlreadyRegistered: () => void
}

export default function StepInviteCode({ data, setData, onNext, onAlreadyRegistered }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Auto-fill from ?code= URL param
  const urlCode = searchParams.get('code') || ''
  const [code,     setCode]     = useState(data.inviteCode || urlCode)
  const [error,    setError]    = useState('')
  const [valid,    setValid]    = useState(false)
  const [checking, setChecking] = useState(false)

  // Auto-validate if code came from URL
  useEffect(() => {
    const initial = data.inviteCode || urlCode
    if (initial) {
      validateCode(initial)
    }
  }, [])

  const validateCode = async (val: string) => {
    if (!val || val.length < 4) return
    setChecking(true)
    setError('')
    setValid(false)

    const { data: result } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', val.toUpperCase())
      .eq('status', 'available')
      .maybeSingle()

    setChecking(false)

    if (result) {
      setValid(true)
      setData({ ...data, inviteCode: val.toUpperCase() })
    } else {
      setValid(false)
      if (val.length >= 4) setError('Invalid or already used invite code.')
    }
  }

  const handleChange = async (val: string) => {
    setCode(val)
    setError('')
    setValid(false)
    setData({ ...data, inviteCode: val.toUpperCase() })
    if (val.length >= 4) {
      await validateCode(val)
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col">
      <div className="mb-6">
        <span className="px-4 py-2 rounded-full border border-white/[0.20] text-white/70 text-[13px] font-medium">
          Private Testnet
        </span>
      </div>

      <h1 className="text-white text-[32px] font-bold leading-tight mb-2">Access Candoxa</h1>
      <p className="text-white/45 text-[14px] mb-8">Candoxa is currently invite-only during testnet.</p>

      <label className="text-white/70 text-[14px] font-medium mb-2">Access Code</label>
      <div className="relative mb-1">
        <input
          type="text"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter your code"
          className="w-full bg-[#0A0A0F] border rounded-xl px-4 py-4 text-white text-[15px] outline-none transition-all pr-11 placeholder-white/25 uppercase"
          style={{ borderColor: error ? '#ef4444' : valid ? '#22c55e' : 'rgba(255,255,255,0.12)' }}
        />
        {valid && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-[18px]">✓</span>
        )}
        {checking && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        )}
      </div>

      {error && <p className="text-red-400 text-[12px] mb-2">{error}</p>}
      {valid && <p className="text-green-400 text-[12px] mb-2">Valid invite code — you're in!</p>}

      {/* Auto-filled badge */}
      {urlCode && valid && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 mb-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6B8AFF" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <p className="text-[#6B8AFF] text-[12px]">Code auto-filled from invite link</p>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-4 rounded-xl text-white text-[15px] font-semibold mt-5 transition-all disabled:opacity-40"
        style={{ background: '#0038FF' }}>
        Verify & Continue →
      </button>

      <button
        onClick={() => router.push('/signin')}
        className="w-full text-center py-3 mt-3 text-white/40 text-[13px] hover:text-white/60 transition-colors">
        Already registered?{' '}
        <span className="font-semibold" style={{ color: '#6B8AFF' }}>Sign in →</span>
      </button>

      <div className="mt-6 flex flex-col gap-2.5">
        {['5 secured entries per day', '3 invite codes', 'Early builder rewards'].map((perk) => (
          <div key={perk} className="flex items-center gap-2">
            <span className="text-white/40 text-[13px]">•</span>
            <span className="text-white/55 text-[13px]">{perk}</span>
          </div>
        ))}
      </div>
    </div>
  )
}