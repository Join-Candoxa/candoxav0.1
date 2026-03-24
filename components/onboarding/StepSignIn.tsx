// components/onboarding/StepSignIn.tsx — Step 1 of 4
'use client'

import { useState, useEffect } from 'react'
import { useRouter }            from 'next/navigation'
import { supabase }             from '@/lib/supabase'
import { usePrivy }             from '@privy-io/react-auth'
import Image                    from 'next/image'

type Props = { onNext: () => void; onBack: () => void }

export default function StepSignIn({ onNext, onBack }: Props) {
  const [loading,        setLoading]        = useState(false)
  const [privyLoading,   setPrivyLoading]   = useState(false)
  const [error,          setError]          = useState('')
  const [privyTriggered, setPrivyTriggered] = useState(false)

  const { login, getAccessToken, authenticated, ready, user: privyUser } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (!privyTriggered || !authenticated || !privyUser) return
    const exchangeToken = async () => {
      setPrivyLoading(true)
      setError('')
      try {
        const privyToken = await getAccessToken()
        if (!privyToken) {
          setError('Could not get token. Please try again.')
          setPrivyLoading(false); setPrivyTriggered(false); return
        }
        const res  = await fetch('/api/auth/privy', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ accessToken: privyToken }),
        })
        const d = await res.json()
        if (!res.ok || d.error) {
          setError(d.error || 'Authentication failed.'); setPrivyLoading(false); setPrivyTriggered(false); return
        }
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: d.token, type: 'magiclink' })
        if (verifyError) {
          setError('Failed to establish session.'); setPrivyLoading(false); setPrivyTriggered(false); return
        }
        setPrivyTriggered(false)
        onNext()
      } catch {
        setError('Something went wrong.'); setPrivyLoading(false); setPrivyTriggered(false)
      }
    }
    exchangeToken()
  }, [authenticated, privyUser, privyTriggered])

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/onboarding?step=3` },
    })
    if (error) { console.error(error); setLoading(false) }
  }

  const handlePrivy = async () => {
    setError(''); setPrivyLoading(true)
    try { setPrivyTriggered(true); await login() }
    catch { setPrivyTriggered(false); setPrivyLoading(false) }
  }

  return (
    <div className="w-full max-w-sm flex flex-col min-h-[80vh]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <div className="w-4 h-4 rounded-full bg-black" />
        </div>
        <span className="text-white font-bold text-[17px]">Candoxa</span>
      </div>

      {/* Step label */}
      <p className="text-[#6B8AFF] text-[14px] font-medium mb-2">Step 1 of 4</p>

      {/* Heading */}
      <h1 className="text-white text-[30px] font-bold leading-tight mb-2">
        Welcome to Candoxa
      </h1>
      <p className="text-white/40 text-[14px] mb-12">
        Own your digital identity permanently.
      </p>

      {/* Spacer pushes buttons down */}
      <div className="flex-1" />

      {/* Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-colors disabled:opacity-60 text-[15px]"
        >
          <Image src="/icons/google.png" alt="Google" width={20} height={20} className="object-contain" />
          {loading ? 'Redirecting...' : 'Sign in with Google'}
        </button>

        <button
          onClick={handlePrivy}
          disabled={privyLoading || !ready}
          className="w-full bg-[#0A0A0F] border border-white/[0.15] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:border-white/25 transition-colors disabled:opacity-60 text-[15px]"
        >
          {privyLoading
            ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Connecting...</>
            : 'Continue with Privy'
          }
        </button>

        {error && (
          <p className="text-red-400 text-[12px] text-center">{error}</p>
        )}

        <p className="text-white/35 text-[13px] text-center mt-1">
          Already have an account?{' '}
          <span onClick={() => router.push('/signin')} className="text-[#6B8AFF] cursor-pointer">Sign In</span>
        </p>
      </div>

      <p className="text-white/25 text-[12px] text-center mt-8">
        Your permanent identity starts here.
      </p>
    </div>
  )
}