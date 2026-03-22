// components/onboarding/StepInviteCode.tsx — Step 1: validate invite code
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OnboardingData } from '@/app/onboarding/page'

type Props = {
  data: OnboardingData
  setData: (d: OnboardingData) => void
  onNext: () => void
}

export default function StepInviteCode({ data, setData, onNext }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [valid, setValid] = useState(false)

 // Updated handleChange — clears error properly when code is valid
const handleChange = async (val: string) => {
  setCode(val)
  setError('')
  setValid(false)
  if (val.length < 4) return

  setChecking(true)
  const { data: result } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', val.toUpperCase())
    .eq('status', 'available')
    .single()

  setChecking(false)
  if (result) {
    setValid(true)
    setError('') // explicitly clear error
    setData({ ...data, inviteCode: val.toUpperCase() })
  } else {
    setValid(false)
    setError('Invalid invite code. Please check and try again.')
  }
}

  return (
    <div className="w-full max-w-md bg-[#0D0D1A] border border-white/10 rounded-2xl p-8">
      <h1 className="text-white text-2xl font-bold text-center mb-2">Access Candoxa Testnet</h1>
      <p className="text-white/40 text-sm text-center mb-8">
        Candoxa is currently invite-only. Enter a valid access code to continue.
      </p>

      <label className="text-white/70 text-sm mb-2 block">Invite Code</label>
      <div className="relative mb-2">
        <input
          type="text"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. DOXA-1"
          className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors ${
            error ? 'border-red-500' : valid ? 'border-green-500' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {valid && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400">✓</span>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white font-medium py-3 rounded-xl mt-4"
      >
        Continue
      </button>
    </div>
  )
}