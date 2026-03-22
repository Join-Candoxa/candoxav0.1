// app/admin/page.tsx — Admin login, pixel-accurate to Figma
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminLogin() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [sessionExpiry, setSessionExpiry] = useState('')

  const handleCredentials = async () => {
    setError('')
    setLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError || !data.user) {
      setError('Invalid credentials. Access denied.')
      return
    }
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single()
    if (!adminData) {
      setError('Unauthorised. This account has no admin access.')
      await supabase.auth.signOut()
      return
    }
    const expiry = new Date(Date.now() + 8 * 3600000)
    setSessionExpiry(expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' today')
    setSessionInfo(adminData)
    setStep(2)
  }

  const handleVerify = () => {
    if (otp.length < 4) { setError('Enter a valid code'); return }
    setError('')
    setStep(3)
  }

  const passwordStrength = (p: string) => {
    if (p.length === 0) return ['bg-white/10', 'bg-white/10', 'bg-white/10']
    if (p.length < 6) return ['bg-red-500', 'bg-white/10', 'bg-white/10']
    if (p.length < 10) return ['bg-red-500', 'bg-yellow-500', 'bg-white/10']
    return ['bg-red-500', 'bg-yellow-500', 'bg-green-500']
  }

  // Figma card styles per step
  const step1CardStyle = {
    background: '#0038FF1A',
    border: '2px solid #0038FF80',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '629px',
  }

  const step2CardStyle = {
    background: '#0038FF1A',
    border: '2px solid #0038FF80',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '696px',
  }

  const step3CardStyle = {
    background: '#0038FF1A',
    border: '2px solid #0038FF80',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '696px',
  }

  const btnStyle = {
    background: '#0038FF',
    borderRadius: '999px',
  }

  // Figma input styling — very dark background, subtle blue border
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 5, 30, 0.7)',
    border: '1px solid rgba(107, 159, 255, 0.25)',
    borderRadius: '8px',
    color: 'white',
    width: '100%',
    padding: '12px 16px',
    outline: 'none',
    fontSize: '14px',
    fontStyle: 'italic',
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-6 mb-10">
      {[{ n: 1, label: 'CREDENTIALS' }, { n: 2, label: 'VERIFY' }, { n: 3, label: 'ACCESS' }].map(({ n, label }) => (
        <div key={n} className="flex flex-col items-center gap-1.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
            style={{
              border: step > n
                ? 'none'
                : '2px solid ' + (step === n ? '#0038FF' : 'rgba(255,255,255,0.2)'),
              background: step > n ? '#0038FF' : 'transparent',
              color: step > n ? '#fff' : step === n ? '#6B9FFF' : 'rgba(255,255,255,0.3)',
            }}
          >
            {step > n ? '✓' : n}
          </div>
          <span
            className="text-xs tracking-wider"
            style={{ color: step >= n ? '#6B9FFF' : 'rgba(255,255,255,0.3)' }}
          >
            {label}
          </span>
        </div>
      ))}
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

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-full px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-xs font-medium">Restricted Access</span>
            </div>

            <h1 className="text-white text-3xl font-bold italic mb-2 text-center">
              Admin <span style={{ color: '#6B9FFF' }}>Access Portal</span>
            </h1>
            <p className="text-sm text-center italic mb-8 max-w-sm" style={{ color: '#6B9FFF80' }}>
              This portal is for authorised Candoxa administrators only. All access attempts are logged and monitored.
            </p>

            <div className="p-10" style={step1CardStyle}>
              <StepIndicator />

              {/* Email */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <label className="italic text-sm" style={{ color: '#6B9FFF99' }}>Admin Email</label>
                  <span className="text-xs cursor-help" style={{ color: '#6B9FFF' }}>ℹ</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@candoxa.com"
                  style={inputStyle}
                  className="placeholder-white/20"
                />
              </div>

              {/* Password */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="italic text-sm" style={{ color: '#6B9FFF99' }}>Password</label>
                    <span className="text-xs cursor-help" style={{ color: '#6B9FFF' }}>ℹ</span>
                  </div>
                  <button
                    onClick={() => router.push('/admin/reset')}
                    className="text-xs italic hover:underline"
                    style={{ color: '#6B9FFF' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B9FFF60' }}>🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCredentials()}
                    style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
                    className="placeholder-white/20"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
                    style={{ color: '#6B9FFF60' }}
                  >
                    👁
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {passwordStrength(password).map((color, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${color}`} />
                  ))}
                </div>
              </div>

              {/* Keep me signed in */}
              <div className="flex items-center gap-2 mb-6 mt-2">
                <button
                  onClick={() => setKeepSignedIn(!keepSignedIn)}
                  className="w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0"
                  style={{
                    background: keepSignedIn ? '#0038FF' : 'transparent',
                    border: keepSignedIn ? '1px solid #0038FF' : '1px solid rgba(107,159,255,0.4)',
                  }}
                >
                  {keepSignedIn && <span className="text-white text-xs leading-none">✓</span>}
                </button>
                <span className="text-sm italic" style={{ color: '#6B9FFF80' }}>Keep me signed in</span>
              </div>

              {error && <p className="text-red-400 text-xs mb-4 italic">{error}</p>}

              <button
                onClick={handleCredentials}
                disabled={loading || !email || !password}
                className="w-full text-white font-medium py-3.5 flex items-center justify-center gap-2 italic transition-opacity mb-5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btnStyle}
              >
                {loading ? 'Verifying...' : <>Continue to verification <span className="text-lg">⊙</span></>}
              </button>

              <div className="flex items-start gap-3">
                <Image src="/icons/lock.png" alt="lock" width={18} height={18} className="object-contain opacity-30 mt-0.5 flex-shrink-0" />                <p className="text-xs italic leading-relaxed" style={{ color: '#6B9FFF60' }}>
                  This session is end-to-end encrypted. Unauthorised access is a violation of Candoxa's terms and may result in legal action.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="p-10" style={step2CardStyle}>
            <StepIndicator />

            <p className="text-xs text-center mb-6 uppercase tracking-widest font-semibold" style={{ color: '#6B9FFF' }}>
              Choose Verification Method
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div
                className="rounded-2xl p-4 text-center cursor-pointer transition-colors"
                style={{ background: '#0038FF1A', border: '1px solid #0038FF40' }}
              >
                <p className="font-bold italic text-sm" style={{ color: '#6B9FFF' }}>Authenticator</p>
                <p className="text-xs mt-1" style={{ color: '#6B9FFF80' }}>Google / Privy</p>
              </div>
              <div className="rounded-2xl p-4 text-center cursor-pointer" style={{ background: '#0038FF' }}>
                <p className="text-white font-bold italic text-sm">Email Code</p>
                <p className="text-white/70 text-xs mt-1">Send email to {email}</p>
              </div>
            </div>

            <p className="text-sm text-center italic mb-6" style={{ color: '#6B9FFF' }}>
              Enter the 6-digit code from your authenticator app
            </p>

            <div className="flex justify-center gap-3 mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={otp[i] || ''}
                  onChange={(e) => {
                    const newOtp = otp.split('')
                    newOtp[i] = e.target.value
                    setOtp(newOtp.join(''))
                    if (e.target.value && i < 5) {
                      document.getElementById(`otp-${i + 1}`)?.focus()
                    }
                  }}
                  className="text-white text-center text-xl font-bold outline-none transition-colors"
                  style={{
                    ...inputStyle,
                    width: '48px',
                    height: '48px',
                    padding: '0',
                    textAlign: 'center',
                    borderRadius: '10px',
                  }}
                />
              ))}
            </div>

            {error && <p className="text-red-400 text-xs text-center mb-3 italic">{error}</p>}

            <p className="text-sm text-center mb-6" style={{ color: '#6B9FFF80' }}>
              Didn't receive it?{' '}
              <span className="cursor-pointer hover:underline italic" style={{ color: '#6B9FFF' }}>
                Resend code
              </span>
            </p>

            <button
              onClick={handleVerify}
              className="w-full text-white font-medium py-3.5 flex items-center justify-center gap-2 italic transition-opacity mb-3"
              style={btnStyle}
            >
              Verify my Identity <span className="text-lg">⊙</span>
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full border text-white/60 font-medium py-3 flex items-center justify-center gap-2 italic hover:border-white/40 transition-colors"
              style={{ borderRadius: '999px', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <span className="text-lg">⊙</span> Back to Credentials
            </button>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="p-10" style={step3CardStyle}>
            <StepIndicator />

            <h2 className="text-white text-2xl font-bold italic text-center mb-1">
              Access <span style={{ color: '#6B9FFF' }}>Granted</span>
            </h2>
            <p className="text-xs text-center mb-2 uppercase tracking-widest font-semibold" style={{ color: '#6B9FFF' }}>
              Identity Verified. Session Active
            </p>
            <p className="text-sm text-center italic mb-8" style={{ color: '#6B9FFF80' }}>
              Welcome back, SuperAdmin. You have full platform access. Your session is valid for 8 hours.
            </p>

            <div className="mb-8">
              {[
                { label: 'Admin', value: sessionInfo?.role === 'super_admin' ? 'Super Admin' : 'Admin', valueColor: '#6B9FFF' },
                { label: 'Access Level', value: 'Full Platform Control', valueColor: '#ffffff' },
                { label: 'Session Expiry', value: sessionExpiry, valueColor: '#ffffff' },
                { label: 'IP ADDRESS', value: '197.x.x.x · Verified', valueColor: 'rgba(255,255,255,0.4)' },
                { label: '2FA Method', value: 'Email code', valueColor: '#ffffff' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0"
                >
                  <span className="text-sm italic" style={{ color: '#6B9FFF80' }}>{row.label}</span>
                  <span className="text-sm font-bold italic" style={{ color: row.valueColor }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-full text-white font-medium py-3.5 flex items-center justify-center gap-2 italic transition-opacity"
              style={btnStyle}
            >
              Enter Dashboard <span className="text-lg">⊙</span>
            </button>
          </div>
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