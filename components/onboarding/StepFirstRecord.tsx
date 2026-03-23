// components/onboarding/StepFirstRecord.tsx — Step 4: secure first record
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OnboardingData } from '@/app/onboarding/page'

type Props = {
  data: OnboardingData
  setData: (d: OnboardingData) => void
  onNext: () => void
  onBack: () => void
}

const platforms = ['YouTube', 'X (Twitter)', 'Instagram', 'LinkedIn', 'GitHub', 'TikTok', 'Medium', 'Substack', 'Other']

export default function StepFirstRecord({ data, setData, onNext, onBack }: Props) {
  const [platform,    setPlatform]    = useState('')
  const [url,         setUrl]         = useState('')
  const [description, setDescription] = useState('')
  const [screenshot,  setScreenshot]  = useState<File | null>(null)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [skipping,    setSkipping]    = useState(false)
  const [error,       setError]       = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    setPreview(URL.createObjectURL(file))
  }

  // Ensure user row exists in users table
  const ensureUserRow = async (session: any) => {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', session.user.email).single()
    if (existing) return existing.id

    // Create the row if missing
    const { data: newRow, error } = await supabase.from('users').insert({
      id:               session.user.id,
      email:            session.user.email,
      username:         data.username || session.user.email.split('@')[0],
      bio:              data.bio || null,
      profile_strength: 0,
      plan:             'free',
      created_at:       new Date().toISOString(),
    }).select('id').single()

    if (error) {
      console.error('Failed to create user row:', error)
      return null
    }
    return newRow?.id
  }

  const handleSkip = async () => {
    setSkipping(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Not authenticated'); setSkipping(false); return }
      await ensureUserRow(session)

      // Create a notification reminder
      const { data: profile } = await supabase
        .from('users').select('id').eq('email', session.user.email).single()
      if (profile?.id) {
        await supabase.from('notifications').insert({
          user_id:    profile.id,
          type:       'reminder',
          message:    "You haven't secured any links yet.",
          subtitle:   'Secure your first record to build your permanent identity.',
          read:       false,
          created_at: new Date().toISOString(),
        })
      }
      onNext()
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setSkipping(false)
    }
  }

  const handleContinue = async () => {
    if (!url.trim()) return setError('Content URL is required')
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setError('Not authenticated'); setLoading(false); return }

      // Ensure user row exists before inserting entry
      const userId = await ensureUserRow(session)
      if (!userId) { setError('Profile not found. Please try again.'); setLoading(false); return }

      // Upload screenshot if provided
      let screenshotUrl: string | null = null
      if (screenshot) {
        const ext  = screenshot.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('screenshots').upload(path, screenshot)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path)
          screenshotUrl = urlData?.publicUrl ?? null
        }
      }

      // Insert entry
      const { error: insertErr } = await supabase.from('entries').insert({
        user_id:        userId,
        title:          url,
        description:    description.trim() || null,
        url:            url.trim(),
        platform:       platform || 'Other',
        screenshot_url: screenshotUrl,
        status:         'secured',
        secured_at:     new Date().toISOString(),
        points:         0,
      })

      if (insertErr) { setError('Failed to save entry'); setLoading(false); return }

      onNext()
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg bg-[#0D0D1A] border border-white/10 rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
      <p className="text-blue-400 text-xs font-medium mb-1">Step 4 of 4</p>
      <h1 className="text-white text-2xl font-bold mb-2">Secure Your First Record</h1>
      <p className="text-white/40 text-sm mb-8">Attach a real achievement to your permanent identity</p>

      {/* Platform */}
      <label className="text-white/70 text-sm mb-2 block">Platform</label>
      <select value={platform} onChange={(e) => setPlatform(e.target.value)}
        className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none mb-6 transition-colors">
        <option value="">Select platform</option>
        {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* URL */}
      <label className="text-blue-400 text-sm mb-2 block">Content URL</label>
      <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError('') }}
        placeholder="https://"
        className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none mb-6 transition-colors" />

      {/* Description */}
      <label className="text-white/70 text-sm mb-2 block">Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
        placeholder="Describe this achievement..."
        className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none mb-6 transition-colors resize-none" />

      {/* Screenshot */}
      <label className="text-white/70 text-sm mb-2 block">Screenshot</label>
      <div onClick={() => document.getElementById('screenshot-input')?.click()}
        className="w-full border border-dashed border-white/10 rounded-xl py-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors mb-6 overflow-hidden">
        {preview
          ? <img src={preview} alt="preview" className="max-h-40 rounded-lg object-contain" />
          : <><span className="text-2xl mb-2">↑</span>
             <p className="text-white/60 text-sm">Upload Screenshot</p>
             <p className="text-white/30 text-xs mt-1">Drag & drop or click to browse</p></>
        }
        <input id="screenshot-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

      {/* Secure button */}
      <button onClick={handleContinue} disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2">
        {loading
          ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Securing...</>
          : 'Continue →'
        }
      </button>

      {/* Skip button */}
      <button onClick={handleSkip} disabled={skipping}
        className="w-full border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors font-medium py-3 rounded-xl mb-3 text-sm">
        {skipping ? 'Skipping...' : 'Skip for now'}
      </button>

      <button onClick={onBack} className="w-full text-white/30 text-sm text-center hover:text-white/50 transition-colors">
        ← Go Back
      </button>
    </div>
  )
}