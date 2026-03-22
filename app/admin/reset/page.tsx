// app/admin/reset/page.tsx — Admin reset password, Figma-accurate
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminReset() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!email) { setError('Please enter your admin email'); return }
    setLoading(true)
    setError('')
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single()
    if (adminData) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset/confirm`,
      })
    }
    setLoading(false)
    setSent(true)
  }

  const cardStyle = {
    background: '#0038FF1A',
    border: '2px solid #0038FF80',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '629px',
  }

  const btnStyle = {
    background: '#0038FF',
    borderRadius: '999px',
  }

  const inputStyle = {
    background: 'rgba(0, 0, 20, 0.6)',
    border: '1px solid rgba(107, 159, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    width: '100%',
    padding: '12px 16px',
    outline: 'none',
    fontSize: '14px',
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-6 mb-10">
      {[{ n: 1, label: 'CREDENTIALS' }, { n: 2, label: 'VERIFY' }, { n: 3, label: 'ACCESS' }].map(({ n, label }) => (
        <div key={n} className="flex flex-col items-center gap-1.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              border: n === 1 ? '2px solid #0038FF' : '2px solid rgba(255,255,255,0.2)',
              color: n === 1 ? '#6B9FFF' : 'rgba(255,255,255,0.3)',
            }}
          >
            {n}
          </div>
          <span className="text-xs tracking-wider" style={{ color: n === 1 ? '#6B9FFF' : 'rgba(255,255,255,0.3)' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center gap-3 px-8 py-4 border-b border-white/5">
        <Image src="/logo.png" alt="Candoxa" width={120} height={40} className="object-contain" />
        <span className="text-white/20 mx-1">|</span>
        <span className="text-white/40 text-sm italic">Admin Access Portal</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

        {!sent ? (
          <>
            <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-full px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-xs font-medium">Restricted Access</span>
            </div>

            <h1 className="text-white text-3xl font-bold italic mb-2 text-center">
              Reset <span style={{ color: '#6B9FFF' }}>Password</span>
            </h1>
            <p className="text-sm text-center italic mb-8 max-w-sm" style={{ color: '#6B9FFF80' }}>
              Enter your admin email. A secure reset link will be sent if the account exists.
            </p>

            <div className="p-10" style={cardStyle}>
              <StepIndicator />

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="italic text-sm" style={{ color: '#6B9FFF99' }}>Admin Email</label>
                  <span className="text-xs cursor-help" style={{ color: '#6B9FFF' }}>ℹ</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="admin@candoxa.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  style={inputStyle}
                  className="placeholder-white/20 focus:border-blue-500 transition-colors"
                />
                {error && <p className="text-red-400 text-xs mt-2 italic">{error}</p>}
              </div>

              <button
                onClick={handleSend}
                disabled={loading || !email}
                className="w-full text-white font-medium py-3.5 flex items-center justify-center gap-2 italic transition-opacity mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btnStyle}
              >
                {loading ? 'Sending...' : <>Send Reset Link <span className="text-lg">⊙</span></>}
              </button>

              <button
                onClick={() => router.push('/admin')}
                className="w-full border text-white/60 font-medium py-3 flex items-center justify-center gap-2 italic hover:border-white/40 transition-colors mb-6"
                style={{ borderRadius: '999px', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-lg">⊙</span> Back to Sign In
              </button>

              <div className="flex items-start gap-3">
                <Image src="/icons/lock.png" alt="lock" width={18} height={18} className="object-contain opacity-30 mt-0.5 flex-shrink-0" />
                <p className="text-xs italic leading-relaxed" style={{ color: '#6B9FFF60' }}>
                  Reset links expire in 15 minutes and can only be used once. The request will be logged.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-full px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-xs font-medium">Restricted Access</span>
            </div>

            <h1 className="text-white text-3xl font-bold italic mb-2 text-center">
              Reset <span style={{ color: '#6B9FFF' }}>Password</span>
            </h1>
            <p className="text-sm text-center italic mb-8 max-w-sm" style={{ color: '#6B9FFF80' }}>
              Enter your admin email. A secure reset link will be sent if the account exists.
            </p>

            <div className="p-10" style={cardStyle}>
              <StepIndicator />

              {/* Envelope */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-14 bg-white rounded-md flex items-center justify-center">
                  <svg viewBox="0 0 64 56" width="48" height="42" fill="none">
                    <rect width="64" height="56" rx="4" fill="black" />
                    <path d="M4 4L32 32L60 4" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    <path d="M4 4H60V52H4V4Z" stroke="white" strokeWidth="3" />
                  </svg>
                </div>
              </div>

              <h2 className="text-white text-xl font-bold italic text-center mb-3">
                Check Inbox
              </h2>
              <p className="text-sm text-center italic leading-relaxed mb-8" style={{ color: '#6B9FFF80' }}>
                If <span style={{ color: '#6B9FFF' }}>{email}</span> is a valid admin account, a reset link has been sent. It expires in 15 minutes.
              </p>

              <button
                onClick={() => router.push('/admin')}
                className="w-full border text-white/60 font-medium py-3 flex items-center justify-center gap-2 italic hover:border-white/40 transition-colors"
                style={{ borderRadius: '999px', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-lg">⊙</span> Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-12 py-4 border-t border-white/5">
        {['Candoxa Admin v1.2', 'Encrypted Session', 'All Access Logged'].map((t) => (
          <span key={t} className="text-white/20 text-xs italic">{t}</span>
        ))}
      </div>
    </div>
  )
}