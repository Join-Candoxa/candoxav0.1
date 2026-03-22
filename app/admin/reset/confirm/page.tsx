// app/admin/reset/confirm/page.tsx — Set new password after clicking reset link
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminResetConfirm() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const checks = [
    { label: 'At least 1 uppsecase', pass: /[A-Z]/.test(newPassword) },
    { label: 'At least 1 number', pass: /[0-9]/.test(newPassword) },
    { label: 'At least 8 character', pass: newPassword.length >= 8 },
  ]

  const allPass = checks.every((c) => c.pass)

  const handleReset = async () => {
    setError('')
    if (!allPass) { setError('Password does not meet requirements'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: resetError } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    setDone(true)
  }

  const cardStyle = {
    background: '#0038FF1A',
    border: '2px solid #0038FF80',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '629px',
  }

  const btnOutlineStyle = {
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.2)',
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 5, 30, 0.7)',
    border: '1px solid rgba(107, 159, 255, 0.25)',
    borderRadius: '8px',
    color: 'white',
    width: '100%',
    padding: '12px 16px 12px 40px',
    outline: 'none',
    fontSize: '14px',
    fontStyle: 'italic',
  }

  // Step indicator — confirm page: step1 done, step2 active/current, step3 inactive
  const StepIndicatorConfirm = () => (
    <div className="flex items-center justify-center gap-6 mb-8">
      {[{ n: 1, label: 'CREDENTIALS' }, { n: 2, label: 'VERIFY' }, { n: 3, label: 'ACCESS' }].map(({ n, label }) => {
        const isDone = n === 1
        const isActive = n === 2
        return (
          <div key={n} className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                border: isDone ? 'none' : '2px solid ' + (isActive ? '#0038FF' : 'rgba(255,255,255,0.2)'),
                background: isDone ? '#0038FF' : 'transparent',
                color: isDone ? '#fff' : isActive ? '#6B9FFF' : 'rgba(255,255,255,0.3)',
              }}
            >
              {isDone ? '✓' : n}
            </div>
            <span
              className="text-xs tracking-wider"
              style={{ color: isDone || isActive ? '#6B9FFF' : 'rgba(255,255,255,0.3)' }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )

  // Step indicator — success page: step1 done, step2 done, step3 active
  const StepIndicatorSuccess = () => (
    <div className="flex items-center justify-center gap-6 mb-8">
      {[{ n: 1, label: 'CREDENTIALS' }, { n: 2, label: 'VERIFY' }, { n: 3, label: 'ACCESS' }].map(({ n, label }) => {
        const isDone = n <= 2
        const isActive = n === 3
        return (
          <div key={n} className="flex flex-col items-center gap-1.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                border: isDone ? 'none' : '2px solid ' + (isActive ? '#0038FF' : 'rgba(255,255,255,0.2)'),
                background: isDone ? '#0038FF' : 'transparent',
                color: isDone ? '#fff' : isActive ? '#6B9FFF' : 'rgba(255,255,255,0.3)',
              }}
            >
              {isDone ? '✓' : n}
            </div>
            <span
              className="text-xs tracking-wider"
              style={{ color: isDone || isActive ? '#6B9FFF' : 'rgba(255,255,255,0.3)' }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-white/5">
        <Image src="/logo.png" alt="Candoxa" width={120} height={40} className="object-contain" />
        <span className="text-white/20 mx-1">|</span>
        <span className="text-white/40 text-sm italic">Admin Access Portal</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

        <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-full px-4 py-1.5 mb-5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-blue-400 text-xs font-medium">Restricted Access</span>
        </div>

        {!done ? (
          <>
            <h1 className="text-white text-3xl font-bold italic mb-2 text-center">
              Confirm New <span style={{ color: '#6B9FFF' }}>Password</span>
            </h1>
            <p className="text-sm text-center italic mb-8 max-w-sm" style={{ color: '#6B9FFF80' }}>
              Enter your admin email. A secure reset link will be sent if the account exists.
            </p>

            <div className="p-10" style={cardStyle}>
              <StepIndicatorConfirm />

              {/* New Password */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <label className="italic text-sm" style={{ color: '#6B9FFF99' }}>New Password</label>
                  <span className="text-xs" style={{ color: '#6B9FFF' }}>ℹ</span>
                </div>
                <div className="relative">
                  <Image
                    src="/icons/lock.png"
                    alt="lock"
                    width={18}
                    height={18}
                    className="object-contain opacity-30 absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                    className="placeholder-white/20"
                  />
                  <button
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
                    style={{ color: '#6B9FFF60' }}
                  >
                    👁
                  </button>
                </div>

                {/* Strength bars */}
                <div className="flex gap-1.5 mt-2 mb-3">
                  {[
                    newPassword.length > 0 ? 'bg-red-500' : 'bg-white/10',
                    newPassword.length >= 6 ? 'bg-yellow-500' : 'bg-white/10',
                    newPassword.length >= 10 ? 'bg-green-500' : 'bg-white/10',
                  ].map((color, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${color}`} />
                  ))}
                </div>

                <p className="text-xs italic mb-2" style={{ color: '#6B9FFF80' }}>Must contain at least;</p>
                <div className="space-y-1.5">
                  {checks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                        style={{
                          background: check.pass ? '#22c55e20' : 'transparent',
                          border: check.pass ? '1.5px solid #22c55e' : '1.5px solid rgba(107,159,255,0.3)',
                          color: check.pass ? '#22c55e' : 'transparent',
                        }}
                      >
                        ✓
                      </div>
                      <span className="text-xs italic" style={{ color: check.pass ? '#22c55e' : '#6B9FFF80' }}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mt-5 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="italic text-sm" style={{ color: '#6B9FFF99' }}>Confirm Password</label>
                  <span className="text-xs" style={{ color: '#6B9FFF' }}>ℹ</span>
                </div>
                <div className="relative">
                  <Image
                    src="/icons/lock.png"
                    alt="lock"
                    width={18}
                    height={18}
                    className="object-contain opacity-30 absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    className="placeholder-white/20"
                  />
                  <button
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
                    style={{ color: '#6B9FFF60' }}
                  >
                    👁
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs mb-4 italic">{error}</p>}

              <button
                onClick={handleReset}
                disabled={loading || !allPass || !confirmPassword}
                className="w-full text-white font-medium py-3.5 flex items-center justify-center gap-2 italic transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={btnOutlineStyle}
              >
                {loading ? 'Resetting...' : <>Reset Password <span className="text-lg">⊙</span></>}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-white text-3xl font-bold italic mb-8 text-center">
              Access <span style={{ color: '#6B9FFF' }}>Granted</span>
            </h1>

            <div className="p-10" style={cardStyle}>
              <StepIndicatorSuccess />

              {/* Big blue checkmark circle */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: '#0038FF' }}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path
                      d="M10 24L20 34L38 14"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <p className="text-sm italic text-center mb-8" style={{ color: '#6B9FFF80' }}>
                Your password has been changed succesfully
              </p>

              <button
                onClick={() => router.push('/admin')}
                className="w-full text-white/70 font-medium py-3.5 flex items-center justify-center gap-2 italic hover:border-white/40 transition-colors"
                style={btnOutlineStyle}
              >
                Continue to Sign In <span className="text-lg">⊙</span>
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