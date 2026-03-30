// components/onboarding/StepFirstRecord.tsx — Step 4 of 4
'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OnboardingData } from '@/app/onboarding/page'

type Props = {
  data:    OnboardingData
  setData: (d: OnboardingData) => void
  onNext:  (entry?: { title: string; platform: string } | null) => void
  onBack:  () => void
}

const platforms = ['YouTube', 'X (Twitter)', 'Instagram', 'LinkedIn', 'GitHub', 'TikTok', 'Medium', 'Substack', 'Other']

export default function StepFirstRecord({ data, setData, onNext, onBack }: Props) {
  const searchParams = useSearchParams()
  const [platform,    setPlatform]    = useState('')
  const [url,         setUrl]         = useState('')
  const [description, setDescription] = useState('')
  const [screenshot,  setScreenshot]  = useState<File | null>(null)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [skipping,    setSkipping]    = useState(false)
  const [error,       setError]       = useState('')

  // Read ?code= from URL — present when user came via referral invite link
  const inviteCode = searchParams.get('code') || data.inviteCode || ''

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    setPreview(URL.createObjectURL(file))
  }

  const ensureUserRow = async (session: any) => {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', session.user.email).single()
    if (existing) return existing.id

    const { data: newRow, error } = await supabase.from('users').insert({
      id:               session.user.id,
      email:            session.user.email,
      username:         data.username || session.user.email.split('@')[0],
      bio:              data.bio || null,
      profile_strength: 0,
      plan:             'free',
      role:             'user',
      created_at:       new Date().toISOString(),
    }).select('id').single()

    if (error) { console.error('Failed to create user row:', error); return null }
    return newRow?.id
  }

  // Mark invite code as pending after user registers
  const markInviteCode = async (userId: string, username: string) => {
    if (!inviteCode) return

    const { data: codeRow } = await supabase
      .from('invite_codes').select('*')
      .eq('code', inviteCode.toUpperCase())
      .eq('status', 'available')
      .single()

    if (!codeRow) return // already used or invalid

    await supabase.from('invite_codes').update({
      status:           'pending',
      invitee_id:       userId,
      invitee_username: username,
      used_by:          userId,
      days_completed:   0,
    }).eq('id', codeRow.id)
  }

  const handleSkip = async () => {
    setSkipping(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSkipping(false); return }
      const userId = await ensureUserRow(session)
      if (userId) {
        await markInviteCode(userId, data.username || session.user.email.split('@')[0])
        await supabase.from('notifications').insert({
          user_id:    userId,
          type:       'reminder',
          message:    "You haven't secured any links yet.",
          subtitle:   'Secure your first record to build your permanent identity.',
          read:       false,
          created_at: new Date().toISOString(),
        })
      }
      onNext(null)
    } catch (err) { console.error(err) }
    finally { setSkipping(false) }
  }

  const handleContinue = async () => {
    if (!url.trim()) return setError('Content URL is required')
    setLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setError('Not authenticated'); setLoading(false); return }

      const userId = await ensureUserRow(session)
      if (!userId) { setError('Profile not found. Please try again.'); setLoading(false); return }

      // Mark invite code as pending
      await markInviteCode(userId, data.username || session.user.email.split('@')[0])

      let screenshotUrl: string | null = null
      if (screenshot) {
        const ext  = screenshot.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('screenshots').upload(path, screenshot)
        if (!uploadErr) {
          const { data: ud } = supabase.storage.from('screenshots').getPublicUrl(path)
          screenshotUrl = ud?.publicUrl ?? null
        }
      }

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
      onNext({ title: url, platform: platform || 'Other' })
    } catch (err) {
      console.error(err); setError('Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-sm flex flex-col">
      <button onClick={onBack}
        className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center mb-7 self-start">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      <p className="text-[#6B8AFF] text-[14px] font-medium mb-2">Step 4 of 4</p>
      <h1 className="text-white text-[28px] font-bold leading-tight mb-2">Secure Your First Record</h1>
      <p className="text-white/40 text-[14px] mb-7">Attach a real achievement to your permanent identity</p>

      <label className="text-white/65 text-[14px] font-medium mb-2">Platform</label>
      <div className="relative mb-5">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}
          className="w-full bg-[#0A0A0F] border border-white/[0.12] rounded-xl px-4 py-4 text-white text-[14px] outline-none appearance-none"
          style={{ WebkitAppearance:'none' }}>
          <option value="" style={{ background:'#0A0A0F' }}>Select platform</option>
          {platforms.map((p) => <option key={p} value={p} style={{ background:'#0A0A0F' }}>{p}</option>)}
        </select>
        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      <label className="text-white/65 text-[14px] font-medium mb-2">Content URL</label>
      <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError('') }}
        placeholder="https://"
        className="w-full bg-[#0A0A0F] border border-white/[0.12] rounded-xl px-4 py-4 text-white text-[14px] outline-none placeholder-white/25 mb-5 focus:border-white/20"
        style={{ borderColor: error ? '#ef4444' : undefined }}
      />

      <label className="text-white/65 text-[14px] font-medium mb-2">Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
        rows={3} placeholder="What is this content about?"
        className="w-full bg-[#0A0A0F] border border-white/[0.12] rounded-xl px-4 py-4 text-white text-[14px] outline-none resize-none placeholder-white/25 mb-5 focus:border-white/20 leading-relaxed"
      />

      <label className="text-white/65 text-[14px] font-medium mb-2">Screenshot</label>
      <div onClick={() => document.getElementById('ob-screenshot')?.click()}
        className="w-full border border-dashed border-white/[0.15] rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer hover:border-white/25 transition-colors mb-2 overflow-hidden bg-[#0A0A0F]">
        {preview ? (
          <img src={preview} alt="preview" className="max-h-36 rounded-lg object-contain" />
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-white/[0.07] flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-white/55 text-[13px] font-medium">Upload Screenshot</p>
            <p className="text-[#6B8AFF] text-[12px] mt-1">Drag & drop or click to browse</p>
          </>
        )}
        <input id="ob-screenshot" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <p className="text-white/30 text-[12px] mb-6">Add context for credibility and discoverability.</p>
      {error && <p className="text-red-400 text-[12px] mb-3">{error}</p>}

      <div className="flex flex-col gap-3">
        <button onClick={handleContinue} disabled={loading}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40"
          style={{ background:'#0038FF' }}>
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                Securing...
              </span>
            : 'Continue →'
          }
        </button>
        <button onClick={handleSkip} disabled={skipping}
          className="w-full text-center text-white/45 text-[14px] font-medium py-2">
          {skipping ? 'Skipping...' : 'Skip for now'}
        </button>
      </div>
    </div>
  )
}