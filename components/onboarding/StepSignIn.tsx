// components/onboarding/StepSignIn.tsx — Step 2
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePrivy } from '@privy-io/react-auth'
import Image from 'next/image'

type Props = { onNext: () => void; onBack: () => void }

export default function StepSignIn({ onNext, onBack }: Props) {
  const [loading,        setLoading]        = useState(false)
  const [privyLoading,   setPrivyLoading]   = useState(false)
  const [error,          setError]          = useState('')
  const [privyTriggered, setPrivyTriggered] = useState(false)

  const { login, getAccessToken, authenticated, ready, user: privyUser } = usePrivy()
  const router = useRouter()

  // ── Watch for Privy auth completing ────────────────────────────────────────
  useEffect(() => {
    if (!privyTriggered) return       // only run if user clicked Privy button
    if (!authenticated) return        // wait until Privy confirms authenticated
    if (!privyUser) return            // wait until user object is available

    const exchangeToken = async () => {
      setPrivyLoading(true)
      setError('')
      try {
        // Get token — at this point authenticated=true so it should work
        const privyToken = await getAccessToken()

        if (!privyToken) {
          setError('Could not get token. Please try again.')
          setPrivyLoading(false)
          setPrivyTriggered(false)
          return
        }

        // Exchange for Supabase session
        const res = await fetch('/api/auth/privy', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ accessToken: privyToken }),
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error || 'Authentication failed. Please try again.')
          setPrivyLoading(false)
          setPrivyTriggered(false)
          return
        }

        // Set Supabase session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
        })

        if (sessionError) {
          setError('Failed to establish session. Please try again.')
          setPrivyLoading(false)
          setPrivyTriggered(false)
          return
        }

        setPrivyTriggered(false)
        onNext()

      } catch (err: any) {
        console.error('Token exchange error:', err)
        setError('Something went wrong. Please try again.')
        setPrivyLoading(false)
        setPrivyTriggered(false)
      }
    }

    exchangeToken()
  }, [authenticated, privyUser, privyTriggered])

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding?step=3` },
    })
    if (error) { console.error(error); setLoading(false) }
  }

  // ── Privy — just open modal, useEffect handles the rest ───────────────────
  const handlePrivy = async () => {
    setError('')
    setPrivyLoading(true)
    try {
      setPrivyTriggered(true)
      await login()
    } catch (err: any) {
      // User closed modal
      setPrivyTriggered(false)
      setPrivyLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-[#0D0D1A] border border-white/10 rounded-2xl p-8">
      <p className="text-blue-400 text-xs font-medium mb-1">Step 2 of 4</p>
      <h1 className="text-white text-2xl font-bold mb-2">Welcome to Candoxa</h1>
      <p className="text-white/40 text-sm mb-10">Secure your digital identity permanently.</p>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full bg-white text-black font-medium py-3 rounded-xl flex items-center justify-center gap-3 mb-3 hover:bg-white/90 transition-colors disabled:opacity-60"
      >
        <Image src="/icons/google.png" alt="Google" width={20} height={20} className="object-contain" />
        {loading ? 'Redirecting...' : 'Sign in with Google'}
      </button>

      {/* Privy */}
      <button
        onClick={handlePrivy}
        disabled={privyLoading || !ready}
        className="w-full bg-[#111118] border border-white/10 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-3 hover:border-white/20 transition-colors disabled:opacity-60"
      >
        {privyLoading
          ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Connecting...</>
          : 'Continue with Privy'
        }
      </button>

      {error && (
        <div className="mt-3 px-4 py-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-300 leading-relaxed">
          {error}
        </div>
      )}

      <p className="text-white/30 text-xs text-center mt-6">
        Already have an account?{' '}
        <span onClick={() => router.push('/signin')} className="text-blue-400 cursor-pointer hover:underline">Sign In</span>
      </p>
      <p className="text-white/20 text-xs text-center mt-8">Your permanent identity will be created automatically.</p>
    </div>
  )
}