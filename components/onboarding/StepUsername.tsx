// components/onboarding/StepUsername.tsx — Step 2 of 4: Choose username
'use client'

import { useState } from 'react'
import { supabase }  from '@/lib/supabase'
import { OnboardingData } from '@/app/onboarding/page'

type Props = {
  data:    OnboardingData
  setData: (d: OnboardingData) => void
  onNext:  () => void
  onBack:  () => void
}

export default function StepUsername({ data, setData, onNext, onBack }: Props) {
  const [username, setUsername] = useState(data.username || '')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleContinue = async () => {
    if (!username.trim()) return setError('Username is required')
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('Letters, numbers, and underscores only')

    setLoading(true)

    if (username.toLowerCase() !== data.username) {
      const { data: existing } = await supabase
        .from('users').select('id').eq('username', username.toLowerCase()).single()
      if (existing) { setLoading(false); return setError('Username already taken') }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('users').update({
        username: username.toLowerCase(),
      }).eq('email', session.user.email)
    }

    setData({ ...data, username: username.toLowerCase() })
    setLoading(false)
    onNext()
  }

  return (
    <div className="w-full max-w-sm flex flex-col min-h-[80vh]">
      {/* Back button */}
      <button onClick={onBack}
        className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center mb-7 self-start">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      {/* Step label */}
      <p className="text-[#6B8AFF] text-[14px] font-medium mb-2">Step 2 of 4</p>

      {/* Heading */}
      <h1 className="text-white text-[28px] font-bold leading-tight mb-2">
        Choose Your Permanent Username
      </h1>
      <p className="text-white/40 text-[14px] mb-8 leading-relaxed">
        This becomes your @handle on Candoxa. It cannot be changed later.
      </p>

      {/* Username input */}
      <label className="text-white/65 text-[14px] font-medium mb-2">Username</label>
      <input
        type="text"
        value={username}
        onChange={(e) => { setUsername(e.target.value); setError('') }}
        placeholder="e.g. afeez_builder"
        className="w-full bg-[#0A0A0F] border rounded-xl px-4 py-4 text-white text-[15px] outline-none transition-all placeholder-white/25 mb-1"
        style={{ borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.12)' }}
      />
      {error
        ? <p className="text-red-400 text-[12px] mb-2">{error}</p>
        : <p className="text-white/30 text-[12px] mb-2">Letters, numbers, and characters only.</p>
      }

      {/* Spacer */}
      <div className="flex-1" />

      {/* Continue button — pinned to bottom */}
      <button
        onClick={handleContinue}
        disabled={!username.trim() || loading}
        className="w-full py-4 rounded-2xl text-white text-[15px] font-semibold transition-all disabled:opacity-40"
        style={{ background: '#0038FF' }}
      >
        {loading
          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> Saving...</span>
          : 'Continue →'
        }
      </button>
    </div>
  )
}