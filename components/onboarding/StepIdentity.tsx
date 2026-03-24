// components/onboarding/StepIdentity.tsx — Step 3 of 4: profile photo + bio
'use client'

import { useState, useRef } from 'react'
import { supabase }          from '@/lib/supabase'
import { OnboardingData }    from '@/app/onboarding/page'

type Props = {
  data:    OnboardingData
  setData: (d: OnboardingData) => void
  onNext:  () => void
  onBack:  () => void
}

export default function StepIdentity({ data, setData, onNext, onBack }: Props) {
  const [bio,           setBio]           = useState(data.bio || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.avatarPreview || null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(data.avatarFile || null)
  const [loading,       setLoading]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleContinue = async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      let avatarUrl: string | null = null

      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop()
        const path = `avatars/${session.user.id}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars').upload(path, avatarFile, { upsert: true })
        if (!uploadErr) {
          const { data: ud } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = `${ud.publicUrl}?t=${Date.now()}`
        }
      }

      await supabase.from('users').update({
        bio:        bio.trim() || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      }).eq('email', session.user.email)
    }

    setData({ ...data, bio, avatarFile, avatarPreview })
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
      <p className="text-[#6B8AFF] text-[14px] font-medium mb-2">Step 3 of 4</p>

      {/* Heading */}
      <h1 className="text-white text-[28px] font-bold leading-tight mb-2">
        Set Up Your Identity
      </h1>
      <p className="text-white/40 text-[14px] mb-7">
        Your bio helps others understand your work.
      </p>

      {/* Profile Photo */}
      <p className="text-white/65 text-[14px] font-medium mb-3">Profile Photo</p>
      <div className="mb-7">
        <div
          className="relative w-20 h-20 rounded-2xl cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#0A0A0F] border border-white/[0.10] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="w-9 h-9">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
          )}
          {/* Camera badge */}
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#0038FF] border-2 border-[#060608] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Bio */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-white/65 text-[14px] font-medium">Bio (optional)</label>
        <span className="text-white/30 text-[12px]">{bio.length}/200</span>
      </div>
      <textarea
        value={bio}
        onChange={(e) => { if (e.target.value.length <= 200) setBio(e.target.value) }}
        rows={4}
        placeholder="e.g. Jane Doe"
        className="w-full bg-[#0A0A0F] border border-white/[0.12] rounded-xl px-4 py-4 text-white/80 text-[14px] outline-none resize-none placeholder-white/25 focus:border-white/20 mb-2 leading-relaxed"
      />
      <p className="text-white/30 text-[12px] mb-6">
        Add context for credibility and discoverability.
      </p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40"
          style={{ background: '#0038FF' }}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> Saving...</span>
            : 'Continue →'
          }
        </button>
        <button onClick={onNext} className="w-full text-center text-white/45 text-[14px] font-medium py-2">
          Skip for now
        </button>
      </div>
    </div>
  )
}
