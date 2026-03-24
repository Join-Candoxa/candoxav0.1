// components/secured/SecuredForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const platforms = ['YouTube', 'X (Twitter)', 'Instagram', 'LinkedIn', 'GitHub', 'TikTok', 'Medium', 'Substack', 'Other']

export default function SecuredForm({ user }: { user: any }) {
  const router = useRouter()
  const [profile,     setProfile]     = useState<any>(null)
  const [platform,    setPlatform]    = useState('')
  const [url,         setUrl]         = useState('')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [visibility,  setVisibility]  = useState<'public' | 'private'>('public')
  const [screenshot,  setScreenshot]  = useState<File | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [dailyUsed,   setDailyUsed]   = useState(0)
  const [fetching,    setFetching]    = useState(false)
  const dailyLimit = 5

  useEffect(() => {
    supabase.from('users').select('*').eq('email', user.email).single()
      .then(({ data }) => { setProfile(data); setDailyUsed(data?.daily_secures_used || 0) })
  }, [user])

  const fetchMetadata = async () => {
    if (!url || url === 'https://') return
    setFetching(true)
    try {
      const res  = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.title && !title)       setTitle(data.title)
      if (data.description && !description) setDescription(data.description)
      if (data.platform)              setPlatform(data.platform)
    } catch { /* fail silently */ }
    finally { setFetching(false) }
  }

  const handleSubmit = async () => {
    if (!platform || !url || dailyUsed >= dailyLimit || !profile) return
    setSubmitting(true)
    try {
      let screenshotUrl = null
      if (screenshot) {
        const ext  = screenshot.name.split('.').pop()
        const path = `${user.id}-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('screenshots').upload(path, screenshot)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path)
          screenshotUrl = urlData.publicUrl
        }
      }
      const blockchainRef = '0x' + Math.random().toString(16).slice(2, 18)
      const blockNumber   = Math.floor(Math.random() * 1000000 + 18000000).toString()

      const { error } = await supabase.from('entries').insert({
        user_id: profile.id, platform, url,
        title: title || url, description, screenshot_url: screenshotUrl,
        visibility, status: 'secured', blockchain_ref: blockchainRef,
        block_number: blockNumber, chain: 'Base',
      })
      if (error) throw error

      await supabase.from('users').update({
        daily_secures_used: dailyUsed + 1,
        profile_strength:   (profile?.profile_strength || 0) + 5,
      }).eq('id', profile.id)

      setSuccess(true)
    } catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl p-8 md:p-10 max-w-md w-full text-center">
          <div className="border-2 border-blue-500 text-blue-400 font-bold text-sm px-4 py-2 rounded-xl inline-block mb-6">
            SECURED
          </div>
          <div className="bg-[#0D0D1A] border border-white/10 rounded-xl p-5 mb-6 text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 bg-blue-900/50 rounded-lg flex items-center justify-center text-xs text-blue-400">
                {platform[0]}
              </div>
              <span className="text-white text-sm font-medium">{title || url}</span>
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Secured.</h2>
          <p className="text-white/40 text-sm mb-8">This record is now permanently tied to your identity.</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setSuccess(false); setPlatform(''); setUrl(''); setTitle(''); setDescription(''); setScreenshot(null) }}
              className="flex-1 border border-white/20 text-white text-sm py-3 rounded-xl hover:border-white/40 transition-colors"
            >
              Secure Another
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="flex-1 text-white text-sm py-3 rounded-xl transition-colors"
              style={{ background: '#0038FF' }}
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6">

      {/* ══════════════════════
          FORM — full width mobile, flex-1 desktop
      ══════════════════════ */}
      <div className="flex-1 min-w-0 bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-5 md:p-8">

        <h1 className="text-white text-[20px] md:text-[24px] font-bold mb-1">
          Permanent Identity Registry
        </h1>
        <p className="text-white/40 text-[13px] mb-7">
          Create a permanent, timestamped record on your identity registry
        </p>

        {/* Platform */}
        <label className="text-[#6B8AFF] text-[13px] font-medium mb-2 block">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.10] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white outline-none mb-5 transition-colors text-[14px]"
          style={{ appearance: 'none', WebkitAppearance: 'none' }}
        >
          <option value="" style={{ background: '#0A0A0F' }}>Select platform</option>
          {platforms.map((p) => (
            <option key={p} value={p} style={{ background: '#0A0A0F' }}>{p}</option>
          ))}
        </select>

        {/* Content URL */}
        <label className="text-[#6B8AFF] text-[13px] font-medium mb-2 block">Content URL</label>
        <div className="relative mb-5">
          <input
            type="url" value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={fetchMetadata}
            placeholder="Https://"
            className="w-full bg-white/[0.04] border border-white/[0.10] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white placeholder-white/25 outline-none transition-colors text-[14px]"
          />
          {fetching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}
        </div>

        {/* Custom Title */}
        <label className="text-[#6B8AFF] text-[13px] font-medium mb-2 block">Custom Title — Optional</label>
        <input
          type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Https://"
          className="w-full bg-white/[0.04] border border-white/[0.10] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white placeholder-white/25 outline-none mb-5 transition-colors text-[14px]"
        />

        {/* Description */}
        <label className="text-[#6B8AFF] text-[13px] font-medium mb-2 block">Description — Optional</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Creator building in public..."
          className="w-full bg-white/[0.04] border border-white/[0.10] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white placeholder-white/25 outline-none mb-5 transition-colors resize-none text-[14px]"
        />

        {/* Screenshot */}
        <label className="text-white/60 text-[13px] font-medium mb-2 block">Screenshot — Optional</label>
        <div
          onClick={() => document.getElementById('screenshot-input')?.click()}
          className="w-full border border-dashed border-white/[0.12] rounded-xl py-7 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors mb-5"
        >
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="text-white/55 text-[13px] font-medium">{screenshot ? screenshot.name : 'Upload Screenshot'}</p>
          <p className="text-white/25 text-[11px] mt-1">Drag & drop or click to browse</p>
          <input id="screenshot-input" type="file" accept="image/*" className="hidden"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
        </div>

        {/* Visibility */}
        <label className="text-[#6B8AFF] text-[13px] font-medium mb-3 block">Visibility</label>
        <div className="flex flex-col gap-3 mb-6">
          {[
            { val: 'public',  label: 'Public',  sub: 'Anyone can discover and view your profile' },
            { val: 'private', label: 'Private', sub: 'Only people you approve can view your profile' },
          ].map(({ val, label, sub }) => (
            <div
              key={val}
              onClick={() => setVisibility(val as 'public' | 'private')}
              className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors"
              style={visibility === val
                ? { borderColor: '#0038FF', background: 'rgba(0,56,255,0.07)' }
                : { borderColor: 'rgba(255,255,255,0.10)' }
              }
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: visibility === val ? '#0038FF' : 'rgba(255,255,255,0.30)' }}
              >
                {visibility === val && <div className="w-2 h-2 rounded-full" style={{ background: '#0038FF' }} />}
              </div>
              <div>
                <p className="text-white text-[14px] font-medium">{label}</p>
                <p className="text-white/40 text-[12px]">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-[12px] mb-6 leading-relaxed">
          By securing this entry, you confirm this record belongs to you.{'\n'}
          This action is permanent once confirmed.
        </p>

        <button
          onClick={handleSubmit}
          disabled={!platform || !url || submitting || dailyUsed >= dailyLimit}
          className="w-full py-4 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#0038FF' }}
        >
          {submitting ? 'Securing...' : 'Secure Entry'}
        </button>
      </div>

      {/* ══════════════════════
          RIGHT SIDEBAR — desktop only
      ══════════════════════ */}
      <div className="hidden md:flex flex-col gap-4 flex-shrink-0" style={{ width: '280px' }}>

        {/* Daily secures */}
        <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-[12px]">Daily Secures</p>
            <p className="text-white text-[13px] font-bold">{dailyUsed} / {dailyLimit} Used</p>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width:`${(dailyUsed/dailyLimit)*100}%`, background:'#0038FF' }} />
          </div>
          <p className="text-white/30 text-[11px] mt-2">Resets in 24h</p>
        </div>

        {/* Entry preview */}
        <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-white/50 text-[11px] mb-4 uppercase tracking-wider font-semibold">Entry Preview</p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ background:'#0038FF' }}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white text-[13px] font-medium">@{profile?.username || 'you'}</p>
              <p className="text-white/40 text-[11px]">@{profile?.username || 'you'}</p>
            </div>
          </div>
          <p className="text-white text-[13px] mb-1">{title || 'Your entry title will appear here'}</p>
          <p className="text-white/40 text-[11px] mb-3">{url || 'https://'}</p>
          <span className="bg-white/[0.05] text-white/40 text-[11px] px-3 py-1 rounded-full">● Pending Anchor</span>

          <div className="mt-4 flex flex-col gap-2">
            <p className="text-white/30 text-[11px] font-semibold">What Happens Next?</p>
            {['Link validated', 'Record anchored', 'Permanent receipt generated'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 text-[11px] flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-white/40 text-[11px]">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}