// app/onboarding/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import StepInviteCode from '@/components/onboarding/StepInviteCode'
import StepSignIn from '@/components/onboarding/StepSignIn'
import StepUsername from '@/components/onboarding/StepUsername'
import StepFirstRecord from '@/components/onboarding/StepFirstRecord'
import StepLoading from '@/components/onboarding/StepLoading'

export type OnboardingData = {
  inviteCode: string
  username: string
  bio: string
  avatarFile: File | null
  avatarPreview: string | null
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    inviteCode: '', username: '', bio: '', avatarFile: null, avatarPreview: null,
  })

  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) setStep(parseInt(stepParam))
  }, [searchParams])

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => s - 1)

  if (loading) return <StepLoading />

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center mb-8 -mt-8">
        <Image src="/logo.png" alt="Candoxa" width={150} height={46} className="object-contain" priority />
      </div>
      {step === 1 && <StepInviteCode data={data} setData={setData} onNext={next} />}
      {step === 2 && (
        <StepSignIn
          onNext={() => { setLoading(true); setTimeout(() => { setLoading(false); next() }, 2500) }}
          onBack={back}
        />
      )}
      {step === 3 && <StepUsername data={data} setData={setData} onNext={next} onBack={back} />}
      {step === 4 && <StepFirstRecord data={data} setData={setData} onNext={() => router.push('/dashboard')} onBack={back} />}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <OnboardingContent />
    </Suspense>
  )
}