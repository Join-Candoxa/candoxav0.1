// app/onboarding/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import StepInviteCode   from '@/components/onboarding/StepInviteCode'
import StepSignIn       from '@/components/onboarding/StepSignIn'
import StepUsername     from '@/components/onboarding/StepUsername'
import StepIdentity     from '@/components/onboarding/StepIdentity'
import StepFirstRecord  from '@/components/onboarding/StepFirstRecord'
import StepLoading      from '@/components/onboarding/StepLoading'

export type OnboardingData = {
  inviteCode:    string
  username:      string
  bio:           string
  avatarFile:    File | null
  avatarPreview: string | null
}

function OnboardingContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [step,    setStep]    = useState<number | 'loading' | 'success' | 'checking'>('checking')
  const [data,    setData]    = useState<OnboardingData>({
    inviteCode: '', username: '', bio: '', avatarFile: null, avatarPreview: null,
  })
  const [secured, setSecured] = useState<{ title: string; platform: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      // Check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession()

      const stepParam = searchParams.get('step')

      if (stepParam === '3') {
        // Returned from Google OAuth redirect — proceed to username setup
        setStep('loading')
        return
      }

      if (session?.user) {
        // Already signed in — check if they have a username set up
        const { data: profile } = await supabase
          .from('users').select('username').eq('email', session.user.email).single()

        if (profile?.username) {
          // Fully registered — go straight to dashboard
          router.push('/dashboard')
          return
        } else {
          // Signed in but no username yet — skip to step 2
          setStep(2)
          return
        }
      }

      // Not signed in — start from invite code gate
      setStep(0)
    }

    init()
  }, [searchParams])

  if (step === 'checking') return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  if (step === 'loading') return (
    <StepLoading onDone={() => setStep(2)} />
  )

  if (step === 'success' && secured) return (
    <SuccessScreen
      entry={secured}
      onSecureAnother={() => setStep(4)}
      onViewProfile={() => router.push('/profile')}
    />
  )

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center px-5 py-10">
      {step === 0 && (
        <div className="mb-8 self-start">
          <Image src="/logo.png" alt="Candoxa" width={130} height={40} className="object-contain" priority />
        </div>
      )}

      {step === 0 && (
        <StepInviteCode
          data={data}
          setData={setData}
          onNext={() => setStep(1)}
          onAlreadyRegistered={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <StepSignIn
          onNext={() => setStep('loading')}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepUsername data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <StepIdentity data={data} setData={setData} onNext={() => setStep(4)} onBack={() => setStep(2)} />
      )}
      {step === 4 && (
        <StepFirstRecord
          data={data}
          setData={setData}
          onNext={(entry) => {
            if (entry) { setSecured(entry); setStep('success') }
            else router.push('/dashboard')
          }}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ entry, onSecureAnother, onViewProfile }: {
  entry: { title: string; platform: string }
  onSecureAnother: () => void
  onViewProfile:   () => void
}) {
  function platformIcon(p: string) {
    const map: Record<string, string> = {
      youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
      twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
    }
    return map[(p||'').toLowerCase().replace(/\s*\(.*?\)\s*/g,'').trim()] ?? '/icons/others.png'
  }

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="bg-[#0A0A0F] border border-white/[0.10] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center overflow-hidden">
                <Image src={platformIcon(entry.platform)} alt={entry.platform} width={22} height={22} />
              </div>
              <p className="text-white font-semibold text-[14px]">{entry.title}</p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ borderColor:'#0038FF', color:'#6B8AFF', background:'rgba(0,56,255,0.10)' }}>
              SECURED
            </span>
          </div>
          <div className="flex items-center justify-center py-10 bg-black/30">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
          <div className="px-4 pb-4 pt-2"><div className="h-1.5 w-24 bg-white/[0.07] rounded-full" /></div>
        </div>

        <div className="text-center">
          <h2 className="text-white text-[26px] font-bold mb-2">Secured.</h2>
          <p className="text-white/40 text-[14px] leading-relaxed">This record is now permanently tied to your identity.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onSecureAnother}
            className="flex-1 py-4 rounded-2xl border border-white/[0.15] text-white text-[14px] font-semibold">
            Secure Another
          </button>
          <button onClick={onViewProfile}
            className="flex-1 py-4 rounded-2xl text-white text-[14px] font-semibold"
            style={{ background:'#0038FF' }}>
            View Profile
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Need supabase for the auth check ──────────────────────────────────────────
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060608]" />}>
      <OnboardingContent />
    </Suspense>
  )
}