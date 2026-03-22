// app/signin/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePrivy } from '@privy-io/react-auth'
import Image from 'next/image'

function SignInContent() {
  const router = useRouter()
  const [loading,        setLoading]        = useState(false)
  const [privyLoading,   setPrivyLoading]   = useState(false)
  const [error,          setError]          = useState('')
  const [privyTriggered, setPrivyTriggered] = useState(false)

  const { login, getAccessToken, authenticated, ready, user: privyUser } = usePrivy()

  useEffect(() => {
    if (!privyTriggered) return
    if (!authenticated) return
    if (!privyUser) return

    const exchangeToken = async () => {
      setPrivyLoading(true)
      setError('')
      try {
        const privyToken = await getAccessToken()
        if (!privyToken) {
          setError('Could not get token. Please try again.')
          setPrivyLoading(false)
          setPrivyTriggered(false)
          return
        }

        const res = await fetch('/api/auth/privy', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ accessToken: privyToken }),
        })

        const data = await res.json()
        if (!res.ok || data.error) {
          setError(data.error || 'Authentication failed.')
          setPrivyLoading(false)
          setPrivyTriggered(false)
          return
        }

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
        router.push('/dashboard')

      } catch (err) {
        console.error(err)
        setError('Something went wrong. Please try again.')
        setPrivyLoading(false)
        setPrivyTriggered(false)
      }
    }

    exchangeToken()
  }, [authenticated, privyUser, privyTriggered])

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { console.error(error); setLoading(false) }
  }

  const handlePrivy = async () => {
    setError('')
    setPrivyLoading(true)
    try {
      setPrivyTriggered(true)
      await login()
    } catch {
      setPrivyTriggered(false)
      setPrivyLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="Candoxa" width={150} height={46} className="object-contain" priority />
      </div>

      <div className="w-full max-w-md bg-[#0D0D1A] border border-white/10 rounded-2xl p-8">
        <h1 className="text-white text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-white/40 text-sm mb-8">Sign in to your Candoxa account.</p>

        <button onClick={handleGoogle} disabled={loading}
          className="w-full bg-white text-black font-medium py-3 rounded-xl flex items-center justify-center gap-3 mb-3 hover:bg-white/90 transition-colors disabled:opacity-60">
          <Image src="/icons/google.png" alt="Google" width={20} height={20} className="object-contain" />
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <button onClick={handlePrivy} disabled={privyLoading || !ready}
          className="w-full bg-[#111118] border border-white/10 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-3 hover:border-white/20 transition-colors disabled:opacity-60">
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
          Don't have an account?{' '}
          <span onClick={() => router.push('/onboarding')} className="text-blue-400 cursor-pointer hover:underline">Get started</span>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SignInContent />
    </Suspense>
  )
}