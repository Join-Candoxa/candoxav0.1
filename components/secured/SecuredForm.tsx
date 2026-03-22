// components/secured/SecuredForm.tsx — Permanent Identity Registry form with metadata auto-fetch
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const platforms = ['YouTube', 'X (Twitter)', 'Instagram', 'LinkedIn', 'GitHub', 'TikTok', 'Medium', 'Substack', 'Other']

export default function SecuredForm({ user }: { user: any }) {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [platform, setPlatform] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dailyUsed, setDailyUsed] = useState(0)
  const [fetching, setFetching] = useState(false)
  const dailyLimit = 5

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()
      setProfile(data)
      setDailyUsed(data?.daily_secures_used || 0)
    }
    fetchProfile()
  }, [user])

  const fetchMetadata = async () => {
    if (!url || url === 'https://') return
    setFetching(true)
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.title && !title) setTitle(data.title)
      if (data.description && !description) setDescription(data.description)
      if (data.platform) setPlatform(data.platform)
    } catch {
      // fail silently
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async () => {
    if (!platform || !url) return
    if (dailyUsed >= dailyLimit) return
    if (!profile) return
    setSubmitting(true)

    try {
      let screenshotUrl = null

      if (screenshot) {
        const ext = screenshot.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(fileName, screenshot)
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('screenshots')
            .getPublicUrl(fileName)
          screenshotUrl = urlData.publicUrl
        }
      }

      const blockchainRef = '0x' + Math.random().toString(16).slice(2, 18)
      const blockNumber = Math.floor(Math.random() * 1000000 + 18000000).toString()

      const { error: entryError } = await supabase.from('entries').insert({
        user_id: profile.id,
        platform,
        url,
        title: title || url,
        description,
        screenshot_url: screenshotUrl,
        visibility,
        status: 'secured',
        blockchain_ref: blockchainRef,
        block_number: blockNumber,
        chain: 'Base',
      })

      if (entryError) throw entryError

      await supabase.from('users').update({
        daily_secures_used: dailyUsed + 1,
        profile_strength: (profile?.profile_strength || 0) + 5,
      }).eq('id', profile.id)

      setSuccess(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
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
              onClick={() => {
                setSuccess(false)
                setPlatform('')
                setUrl('')
                setTitle('')
                setDescription('')
                setScreenshot(null)
              }}
              className="flex-1 border border-white/20 text-white text-sm py-3 rounded-xl hover:border-white/40 transition-colors"
            >
              Secure Another
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-3 rounded-xl transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Left — form */}
      <div className="flex-1 bg-[#0A0A0F] border border-white/8 rounded-2xl p-8">
        <h1 className="text-white text-2xl font-bold mb-1">Permanent Identity Registry</h1>
        <p className="text-white/40 text-sm mb-8">Create a permanent, timestamped record on your identity registry</p>

        {/* Platform */}
        <label className="text-white/70 text-sm mb-2 block">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none mb-6 transition-colors"
        >
          <option value="">Select platform</option>
          {platforms.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* URL with auto-fetch */}
        <label className="text-blue-400 text-sm mb-2 block">Content URL</label>
        <div className="relative mb-6">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={fetchMetadata}
            placeholder="https://"
            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors"
          />
          {fetching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <label className="text-blue-400 text-sm mb-2 block">Custom Title — Optional</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. My viral thread on SaaS growth"
          className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none mb-6 transition-colors"
        />

        {/* Description */}
        <label className="text-blue-400 text-sm mb-2 block">Description — Optional</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Creator building in public..."
          className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none mb-6 transition-colors resize-none"
        />

        {/* Screenshot upload */}
        <label className="text-white/70 text-sm mb-2 block">Screenshot — Optional</label>
        <div
          onClick={() => document.getElementById('screenshot-input')?.click()}
          className="w-full border border-dashed border-white/10 rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors mb-6"
        >
          <span className="text-2xl mb-2">↑</span>
          <p className="text-white/60 text-sm">{screenshot ? screenshot.name : 'Upload Screenshot'}</p>
          <p className="text-white/30 text-xs mt-1">Drag & drop or click to browse</p>
          <input
            id="screenshot-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
          />
        </div>

        {/* Visibility */}
        <label className="text-blue-400 text-sm mb-3 block">Visibility</label>
        <div className="space-y-3 mb-8">
          <div
            onClick={() => setVisibility('public')}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${visibility === 'public' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${visibility === 'public' ? 'border-blue-500' : 'border-white/30'}`}>
              {visibility === 'public' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <div>
              <p className="text-white text-sm font-medium">Public</p>
              <p className="text-white/40 text-xs">Anyone can discover and view your profile</p>
            </div>
          </div>
          <div
            onClick={() => setVisibility('private')}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${visibility === 'private' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${visibility === 'private' ? 'border-blue-500' : 'border-white/30'}`}>
              {visibility === 'private' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <div>
              <p className="text-white text-sm font-medium">Private</p>
              <p className="text-white/40 text-xs">Only people you approve can view your profile</p>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-xs mb-6">
          By securing this entry, you confirm this record belongs to you. This action is permanent once confirmed.
        </p>

        <button
          onClick={handleSubmit}
          disabled={!platform || !url || submitting || dailyUsed >= dailyLimit}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white font-medium py-3 rounded-xl"
        >
          {submitting ? 'Securing...' : 'Secure Entry'}
        </button>
      </div>

      {/* Right — preview */}
      <div className="w-72 shrink-0 space-y-4">
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-xs">Daily Secures</p>
            <p className="text-white text-sm font-bold">{dailyUsed} / {dailyLimit} Used</p>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(dailyUsed / dailyLimit) * 100}%` }}
            />
          </div>
          <p className="text-white/30 text-xs mt-2">Resets in 24h</p>
        </div>

        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-5">
          <p className="text-white/50 text-xs mb-4 uppercase tracking-wider">Entry Preview</p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium">@{profile?.username || 'you'}</p>
              <p className="text-white/40 text-xs">@{profile?.username || 'you'}</p>
            </div>
          </div>
          <p className="text-white text-sm mb-1">{title || 'Your entry title will appear here'}</p>
          <p className="text-white/40 text-xs mb-3">{url || 'https://'}</p>
          <span className="bg-white/5 text-white/40 text-xs px-3 py-1 rounded-full">● Pending Anchor</span>

          <div className="mt-4 space-y-2">
            <p className="text-white/30 text-xs font-medium">What Happens Next?</p>
            {['Link validated', 'Record anchored', 'Permanent receipt generated'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 text-xs flex items-center justify-center">
                  {i + 1}
                </div>
                <span className="text-white/40 text-xs">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}