// components/dashboard/AddEntryModal.tsx
'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface Props {
  user: any
  profile: any
  onClose: () => void
  onSuccess: () => void
}

const STEPS = 4

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-2 w-full">
      {Array.from({ length: STEPS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[3px] rounded-full transition-all duration-300"
          style={{ background: i < step ? '#0038FF' : 'rgba(255,255,255,0.12)' }}
        />
      ))}
    </div>
  )
}

export default function AddEntryModal({ user, profile, onClose, onSuccess }: Props) {
  const [step,        setStep]        = useState(1)
  const [url,         setUrl]         = useState('')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [screenshot,  setScreenshot]  = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [platform,    setPlatform]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [blockRef,    setBlockRef]    = useState('—')
  const [chain,       setChain]       = useState('Base')
  const [blockNum,    setBlockNum]    = useState('—')
  const fileRef = useRef<HTMLInputElement>(null)

  // Detect platform from URL
  const detectPlatform = (u: string) => {
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube'
    if (u.includes('x.com') || u.includes('twitter.com'))   return 'X (Twitter)'
    if (u.includes('instagram.com'))                         return 'Instagram'
    if (u.includes('linkedin.com'))                          return 'LinkedIn'
    if (u.includes('github.com'))                            return 'GitHub'
    return 'Other'
  }

  const handleStep1Continue = () => {
    if (!url.trim()) return
    setPlatform(detectPlatform(url))
    setStep(2)
  }

  const handleStep2Continue = () => {
    if (!title.trim()) return
    setStep(3)
  }

  const handleStep3Continue = () => {
    setStep(4)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleSecure = async () => {
    setLoading(true)
    try {
      let screenshotUrl = null

      // Upload screenshot if provided
      if (screenshot && profile?.id) {
        const ext  = screenshot.name.split('.').pop()
        const path = `${profile.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('screenshots').upload(path, screenshot)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path)
          screenshotUrl = urlData?.publicUrl ?? null
        }
      }

      // Insert entry
      const { error } = await supabase.from('entries').insert({
        user_id:        profile?.id,
        title,
        description,
        url,
        platform,
        screenshot_url: screenshotUrl,
        status:         'secured',
        secured_at:     new Date().toISOString(),
        points:         0,
      })

      if (!error) {
        onSuccess()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Modal — 657×471, border-radius 16px, padding 20px, gap 28px, bg #0A0A0F */}
      <div
        className="relative flex flex-col border border-white/[0.10]"
        style={{
          width: '657px',
          minHeight: '471px',
          borderRadius: '16px',
          padding: '20px',
          gap: '28px',
          background: '#0A0A0F',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col" style={{ gap: '6px' }}>
          <h2 className="text-white text-[20px] font-bold tracking-tight">Add Entry</h2>
          <p className="text-white/40 text-[13px]">
            Secure your work, timestamped, locked, and permanently tied to your profile
          </p>
        </div>

        {/* Progress bar */}
        <ProgressBar step={step} />

        {/* ── Step 1 — URL ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1" style={{ gap: '28px' }}>
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-[11px] font-bold tracking-[0.12em] uppercase">
                Content URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStep1Continue()}
                placeholder="Paste link from x, Youtube, GitHub...."
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/20 transition-colors"
              />
            </div>
            <div className="mt-auto">
              <button
                onClick={handleStep1Continue}
                disabled={!url.trim()}
                className="w-full py-4 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#0038FF' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 — Title + Description ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1" style={{ gap: '16px' }}>
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-[13px] font-medium">Tittle</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="How I built a SaaS in 30 days"
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/20 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-white/70 text-[13px] font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Https://"
                rows={4}
                className="w-full flex-1 bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/20 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => setStep(1)}
                className="flex-none px-6 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors flex items-center gap-2"
              >
                ← Go Back
              </button>
              <button
                onClick={handleStep2Continue}
                disabled={!title.trim()}
                className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#0038FF' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Screenshot upload ── */}
        {step === 3 && (
          <div className="flex flex-col flex-1" style={{ gap: '16px' }}>
            <label className="text-white/70 text-[11px] font-bold tracking-[0.12em] uppercase">
              Analytics Screenshot
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/[0.15] rounded-xl cursor-pointer hover:border-white/25 transition-colors bg-white/[0.02]"
              style={{ minHeight: '160px' }}
            >
              {screenshotPreview ? (
                <img src={screenshotPreview} alt="preview" className="max-h-[160px] rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-white/60 text-[13px] font-medium">Upload Screenshot</p>
                  <p className="text-white/25 text-[11px]">Drag & drop or click to browse</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-none px-6 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors flex items-center gap-2"
              >
                ← Go Back
              </button>
              <button
                onClick={handleStep3Continue}
                className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold transition-all"
                style={{ background: '#0038FF' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 — Confirm & Secure ── */}
        {step === 4 && (
          <div className="flex flex-col flex-1" style={{ gap: '20px' }}>
            {/* Lock icon + ready to secure */}
            <div className="flex flex-col items-center gap-2 text-center">
              <Image src="/icons/lock.png" alt="Lock" width={36} height={36} className="brightness-0 invert opacity-80" />
              <p className="text-white font-semibold text-[15px]">Ready to secure</p>
              <p className="text-white/35 text-[12px] leading-relaxed max-w-[420px]">
                This entry will be timestamped and anchored to the blockchain permanently tied to @{profile?.username}.
                This action cannot be undone.
              </p>
            </div>

            {/* Details card */}
            <div className="border border-white/[0.10] rounded-xl overflow-hidden">
              {[
                { label: 'Entry',          value: title,                      color: 'text-white/80' },
                { label: 'Creator',        value: `@${profile?.username || '—'}`, color: 'text-white/80' },
                { label: 'Platform',       value: platform,                   color: 'text-white/80' },
                { label: 'Status',         value: '● Secured · Indelible',    color: 'text-green-400' },
                { label: 'Blockchain Ref', value: '— (pending)',              color: 'text-white/45' },
                { label: 'Chain',          value: 'Base',                     color: 'text-white/80' },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <span className="text-blue-400/80 text-[13px] font-medium">{row.label}</span>
                  <span className={`text-[13px] font-medium ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => setStep(3)}
                className="flex-none px-6 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors flex items-center gap-2"
              >
                ← Go Back
              </button>
              <button
                onClick={handleSecure}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#0038FF' }}
              >
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Securing...</>
                ) : 'Secure to Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}