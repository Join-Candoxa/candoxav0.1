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

const stepLabels = [
  'Step 1 — Paste your link',
  'Step 2 — Add details',
  'Step 3 — Upload screenshot',
  'Step 4 — Confirm & secure',
]

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: STEPS }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[3px] rounded-full transition-all duration-300"
          style={{ background: i < step ? '#0038FF' : 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </div>
  )
}

export default function AddEntryModal({ user, profile, onClose, onSuccess }: Props) {
  const [step,              setStep]              = useState(1)
  const [url,               setUrl]               = useState('')
  const [title,             setTitle]             = useState('')
  const [description,       setDescription]       = useState('')
  const [screenshot,        setScreenshot]        = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [platform,          setPlatform]          = useState('')
  const [loading,           setLoading]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const handleStep3Continue = () => setStep(4)

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
      if (!error) { onSuccess(); onClose() }
    } finally {
      setLoading(false)
    }
  }

  // Step 1 & 2 use "Secure to profile" as title, steps 3 & 4 use "Add Entry"
  const sheetTitle    = step <= 2 ? 'Secure to profile' : 'Add Entry'
  const sheetSubtitle = step <= 2 ? null : 'Secure your work, timestamped, locked, and permanently tied to your profile'

  return (
    <>
      {/* ════════════════════════════════════════════════
          BACKDROP
          Mobile: semi-transparent so page shows through
          Desktop: darker blur
      ════════════════════════════════════════════════ */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* ════════════════════════════════════════════════
          MOBILE — bottom sheet
      ════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[60] flex flex-col"
        style={{
          background:   '#0D0D14',
          borderRadius: '20px 20px 0 0',
          border:       '1px solid rgba(255,255,255,0.10)',
          borderBottom: 'none',
          maxHeight:    '90vh',
          overflowY:    'auto',
          padding:      '20px 16px 32px',
          gap:          '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-white text-[18px] font-bold">{sheetTitle}</h2>
            {sheetSubtitle && (
              <p className="text-white/40 text-[12px] mt-1 leading-relaxed">{sheetSubtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.10] flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0 ml-3 mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Progress + step label */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <ProgressBar step={step} />
          <p className="text-[#6B8AFF] text-[12px] font-medium">{stepLabels[step - 1]}</p>
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStep1Continue()}
              placeholder="Paste link fom x, Youtube, GitHub...."
              className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/25 transition-colors"
            />
            <button
              onClick={handleStep1Continue}
              disabled={!url.trim()}
              className="w-full py-4 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-40"
              style={{ background: '#0038FF' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-[13px] font-medium">Tittle</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="How I built a SaaS in 30 days"
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/25 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-[13px] font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Https://"
                rows={4}
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/25 transition-colors resize-none"
              />
            </div>
            <button
              onClick={handleStep2Continue}
              disabled={!title.trim()}
              className="w-full py-4 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-40"
              style={{ background: '#0038FF' }}
            >
              Continue
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full text-center text-white/50 text-[14px] font-medium flex items-center justify-center gap-1.5"
            >
              ← Go Back
            </button>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-white/55 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Analytics Screenshot
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center border border-dashed border-white/[0.15] rounded-xl cursor-pointer hover:border-white/25 transition-colors bg-white/[0.02]"
              style={{ minHeight: '160px' }}
            >
              {screenshotPreview ? (
                <img src={screenshotPreview} alt="preview" className="max-h-[160px] rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="w-11 h-11 rounded-full bg-white/[0.07] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-white/60 text-[13px] font-medium">Upload Screenshot</p>
                  <p className="text-white/30 text-[11px]">Drag & drop or click to browse</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-none px-5 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold flex items-center gap-1.5"
              >
                ← Go Back
              </button>
              <button
                onClick={handleStep3Continue}
                className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold"
                style={{ background: '#0038FF' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 ── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center py-2">
              <Image src="/icons/lock.png" alt="Lock" width={34} height={34} className="brightness-0 invert opacity-75" />
              <p className="text-white font-semibold text-[15px]">Ready to secure</p>
              <p className="text-white/35 text-[12px] leading-relaxed">
                This entry will be timestamped and anchored to the blockchain permanently tied to @{profile?.username}. This action cannot be undone.
              </p>
            </div>

            <div className="border border-white/[0.10] rounded-xl overflow-hidden">
              {[
                { label: 'Entry',          value: title,                         color: 'rgba(255,255,255,0.80)' },
                { label: 'Creator',        value: `@${profile?.username || '—'}`, color: 'rgba(255,255,255,0.80)' },
                { label: 'Platform',       value: platform,                      color: 'rgba(255,255,255,0.80)' },
                { label: 'Status',         value: '● Secured · Indelible',       color: '#4ade80' },
                { label: 'Blockchain Ref', value: '— (pending)',                 color: 'rgba(255,255,255,0.40)' },
                { label: 'Chain',          value: 'Base',                        color: 'rgba(255,255,255,0.80)' },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <span className="text-[#6B8AFF] text-[13px] font-medium">{row.label}</span>
                  <span className="text-[13px] font-medium" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-none px-5 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold flex items-center gap-1.5"
              >
                ← Go Back
              </button>
              <button
                onClick={handleSecure}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#0038FF' }}
              >
                {loading
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Securing...</>
                  : 'Secure to Profile'
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          DESKTOP — centered modal (unchanged)
      ════════════════════════════════════════════════ */}
      <div
        className="hidden md:flex fixed inset-0 z-[60] items-center justify-center"
        onClick={onClose}
      >
        <div
          className="relative flex flex-col border border-white/[0.10]"
          style={{
            width:     '657px',
            minHeight: '471px',
            borderRadius: '16px',
            padding:   '20px',
            gap:       '28px',
            background: '#0A0A0F',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-white text-[20px] font-bold tracking-tight">Add Entry</h2>
            <p className="text-white/40 text-[13px]">Secure your work, timestamped, locked, and permanently tied to your profile</p>
          </div>

          <ProgressBar step={step} />

          {/* Step 1 */}
          {step === 1 && (
            <div className="flex flex-col flex-1 gap-7">
              <div className="flex flex-col gap-2">
                <label className="text-white/70 text-[11px] font-bold tracking-[0.12em] uppercase">Content URL</label>
                <input
                  type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStep1Continue()}
                  placeholder="Paste link from x, Youtube, GitHub...."
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/20 transition-colors"
                />
              </div>
              <div className="mt-auto">
                <button onClick={handleStep1Continue} disabled={!url.trim()}
                  className="w-full py-4 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-40"
                  style={{ background: '#0038FF' }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="flex flex-col flex-1 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white/70 text-[13px] font-medium">Tittle</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="How I built a SaaS in 30 days"
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/20 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-white/70 text-[13px] font-medium">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Https://" rows={4}
                  className="w-full flex-1 bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none placeholder-white/25 focus:border-white/20 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 mt-auto">
                <button onClick={() => setStep(1)}
                  className="flex-none px-6 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors flex items-center gap-2">
                  ← Go Back
                </button>
                <button onClick={handleStep2Continue} disabled={!title.trim()}
                  className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold transition-all disabled:opacity-40"
                  style={{ background: '#0038FF' }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="flex flex-col flex-1 gap-4">
              <label className="text-white/70 text-[11px] font-bold tracking-[0.12em] uppercase">Analytics Screenshot</label>
              <div onClick={() => fileRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/[0.15] rounded-xl cursor-pointer hover:border-white/25 transition-colors bg-white/[0.02]"
                style={{ minHeight: '160px' }}>
                {screenshotPreview
                  ? <img src={screenshotPreview} alt="preview" className="max-h-[160px] rounded-lg object-contain" />
                  : <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center">
                        <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <p className="text-white/60 text-[13px] font-medium">Upload Screenshot</p>
                      <p className="text-white/25 text-[11px]">Drag & drop or click to browse</p>
                    </div>
                }
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex-none px-6 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors flex items-center gap-2">
                  ← Go Back
                </button>
                <button onClick={handleStep3Continue}
                  className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold"
                  style={{ background: '#0038FF' }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="flex flex-col flex-1 gap-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Image src="/icons/lock.png" alt="Lock" width={36} height={36} className="brightness-0 invert opacity-80" />
                <p className="text-white font-semibold text-[15px]">Ready to secure</p>
                <p className="text-white/35 text-[12px] leading-relaxed max-w-[420px]">
                  This entry will be timestamped and anchored to the blockchain permanently tied to @{profile?.username}. This action cannot be undone.
                </p>
              </div>
              <div className="border border-white/[0.10] rounded-xl overflow-hidden">
                {[
                  { label: 'Entry',          value: title,                         color: 'rgba(255,255,255,0.80)' },
                  { label: 'Creator',        value: `@${profile?.username || '—'}`, color: 'rgba(255,255,255,0.80)' },
                  { label: 'Platform',       value: platform,                      color: 'rgba(255,255,255,0.80)' },
                  { label: 'Status',         value: '● Secured · Indelible',       color: '#4ade80' },
                  { label: 'Blockchain Ref', value: '— (pending)',                 color: 'rgba(255,255,255,0.40)' },
                  { label: 'Chain',          value: 'Base',                        color: 'rgba(255,255,255,0.80)' },
                ].map((row, i, arr) => (
                  <div key={row.label}
                    className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                    <span className="text-blue-400/80 text-[13px] font-medium">{row.label}</span>
                    <span className="text-[13px] font-medium" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-auto">
                <button onClick={() => setStep(3)}
                  className="flex-none px-6 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold hover:bg-white/[0.04] transition-colors flex items-center gap-2">
                  ← Go Back
                </button>
                <button onClick={handleSecure} disabled={loading}
                  className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#0038FF' }}>
                  {loading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Securing...</>
                    : 'Secure to Profile'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}