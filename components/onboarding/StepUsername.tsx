// components/onboarding/StepUsername.tsx — Step 3: Set Up Your Identity
'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { OnboardingData } from '@/app/onboarding/page'

type Props = {
  data: OnboardingData
  setData: (d: OnboardingData) => void
  onNext: () => void
  onBack: () => void
}

export default function StepUsername({ data, setData, onNext, onBack }: Props) {
  const [username,      setUsername]      = useState(data.username || '')
  const [bio,           setBio]           = useState(data.bio || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.avatarPreview || null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(data.avatarFile || null)
  const [error,         setError]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleContinue = async () => {
    if (!username.trim()) return setError('Username is required')
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('Letters, numbers, and underscores only')

    setLoading(true)

    // Only check uniqueness if username changed from what was previously saved
    if (username.toLowerCase() !== data.username) {
      const { data: existing } = await supabase
        .from('users').select('id').eq('username', username.toLowerCase()).single()
      if (existing) {
        setLoading(false)
        return setError('Username already taken')
      }
    }

    // Upload avatar if a new file was selected
    let avatarUrl: string | null = null
    if (avatarFile) {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (userId) {
        const ext  = avatarFile.name.split('.').pop()
        const path = `avatars/${userId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars').upload(path, avatarFile, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = urlData.publicUrl
        }
      }
    }

    // Save to DB
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('users').update({
        username:   username.toLowerCase(),
        bio:        bio.trim() || null,
        avatar_url: avatarUrl,
      }).eq('email', session.user.email)
    }

    // Persist in parent state so going back restores values
    setData({ ...data, username: username.toLowerCase(), bio, avatarFile, avatarPreview })
    setLoading(false)
    onNext()
  }

  return (
    <div className="w-full max-w-lg bg-[#0D0D1A] border border-white/10 rounded-2xl p-8">
      <p className="text-blue-400 text-xs font-medium mb-1">Step 3 of 4</p>
      <h1 className="text-white text-2xl font-bold mb-2">Set Up Your Identity</h1>
      <p className="text-white/40 text-sm mb-7">Your bio helps others understand your work.</p>

      {/* Profile Photo */}
      <p className="text-blue-400 text-sm font-medium mb-3">Profile Photo</p>
      <div className="flex items-center gap-4 mb-7">
        <div onClick={() => fileRef.current?.click()} className="relative w-16 h-16 rounded-full cursor-pointer flex-shrink-0">
          {avatarPreview
            ? <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            : <div className="w-16 h-16 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" className="w-7 h-7">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
          }
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 border-2 border-[#0D0D1A] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Username */}
      <label className="text-blue-400 text-sm font-medium mb-2 block">Username</label>
      <input
        type="text"
        value={username}
        onChange={(e) => { setUsername(e.target.value); setError('') }}
        placeholder="e.g. afeez_builder"
        className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors mb-1 ${
          error ? 'border-red-500' : 'border-white/10 focus:border-blue-500'
        }`}
      />
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      {/* Bio */}
      <div className="flex items-center justify-between mb-2 mt-5">
        <label className="text-blue-400 text-sm font-medium">Bio (optional)</label>
        <span className="text-white/25 text-xs">{bio.length}/200</span>
      </div>
      <textarea
        value={bio}
        onChange={(e) => { if (e.target.value.length <= 200) setBio(e.target.value) }}
        rows={4}
        placeholder="e.g. Creator building in public..."
        className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors resize-none mb-2"
      />
      <p className="text-white/25 text-xs mb-7">Add context for credibility and discoverability.</p>

      <button
        onClick={handleContinue}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
      >
        {loading ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving...</> : 'Continue →'}
      </button>
      <button onClick={onBack} className="w-full text-white/40 text-sm text-center hover:text-white/60 transition-colors">
        ← Go Back
      </button>
    </div>
  )
}