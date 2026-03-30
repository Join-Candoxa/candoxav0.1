// app/admin/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminLogin() {
  const router = useRouter()
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [adminInfo,    setAdminInfo]    = useState<any>(null)

  const passwordStrength = (p: string) => {
    if (p.length === 0) return ['bg-white/10', 'bg-white/10', 'bg-white/10']
    if (p.length < 6)   return ['bg-red-500',  'bg-white/10', 'bg-white/10']
    if (p.length < 10)  return ['bg-red-500',  'bg-yellow-500', 'bg-white/10']
    return ['bg-red-500', 'bg-yellow-500', 'bg-green-500']
  }

  const handleLogin = async () => {
    setError('')
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)

    // Step 1 — sign in with Supabase Auth
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError('Invalid credentials. Access denied.')
      setLoading(false)
      return
    }

    // Step 2 — verify this email is in admin_users
    const { data: adminRow } = await supabase
      .from('admin_users').select('*').eq('email', email).single()

    if (!adminRow) {
      setError('Unauthorised. This account has no admin access.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    setAdminInfo(adminRow)
    setLoading(false)
    setSuccess(true)

    // Small delay to show success state then redirect
    setTimeout(() => router.push('/admin/dashboard'), 1200)
  }

  const cardStyle = {
    background:   '#0038FF1A',
    border:       '2px solid #0038FF80',
    borderRadius: '16px',
    width:        '100%',
    maxWidth:     '520px',
  }

  const inputStyle: React.CSSProperties = {
    background:   'rgba(0, 5, 30, 0.7)',
    border:       '1px solid rgba(107, 159, 255, 0.25)',
    borderRadius: '8px',
    color:        'white',
    width:        '100%',
    padding:      '12px 16px',
    outline:      'none',
    fontSize:     '14px',
    fontStyle:    'italic',
  }

  const btnStyle = { background: '#0038FF', borderRadius: '999px' }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-white/5">
        <Image src="/logo.png" alt="Candoxa" width={120} height={40} className="object-contain" />
        <span className="text-white/20 mx-1">|</span>
        <span className="text-white/40 text-sm italic">Admin Access Portal</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

        {!success ? (
          <>
            <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-full px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-xs font-medium">Restricted Access</span>
            </div>

            <h1 className="text-white text-3xl font-bold italic mb-2 text-center">
              Admin <span style={{ color:'#6B9FFF' }}>Access Portal</span>
            </h1>
            <p className="text-sm text-center italic mb-8 max-w-sm" style={{ color:'#6B9FFF80' }}>
              This portal is for authorised Candoxa administrators only. All access attempts are logged and monitored.
            </p>

            <div className="p-8 md:p-10" style={cardStyle}>

              {/* Email */}
              <div className="mb-5">
                <label className="italic text-sm block mb-2" style={{ color:'#6B9FFF99' }}>Admin Email</label>
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
                  <label className="italic text-sm" style={{ color:'#6B9FFF99' }}>Password</label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40" style={{ color:'#6B9FFF' }}>
                    <Image src="/icons/lock.png" alt="lock" width={14} height={14} className="object-contain" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
                    className="placeholder-white/20"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
                      {showPassword
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {passwordStrength(password).map((color, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${color}`} />
                  ))}
                </div>
              </div>

              {/* Keep signed in */}
              <div className="flex items-center gap-2 mb-6 mt-3">
                <button
                  onClick={() => setKeepSignedIn(!keepSignedIn)}
                  className="w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0"
                  style={{
                    background: keepSignedIn ? '#0038FF' : 'transparent',
                    border:     keepSignedIn ? '1px solid #0038FF' : '1px solid rgba(107,159,255,0.4)',
                  }}
                >
                  {keepSignedIn && <span className="text-white text-xs leading-none">✓</span>}
                </button>
                <span className="text-sm italic" style={{ color:'#6B9FFF80' }}>Keep me signed in</span>
              </div>

              {error && <p className="text-red-400 text-xs mb-4 italic">{error}</p>}

              <button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full text-white font-medium py-3.5 flex items-center justify-center gap-2 italic transition-opacity mb-5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btnStyle}
              >
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verifying...</>
                ) : (
                  <>Access Dashboard <span className="text-lg">→</span></>
                )}
              </button>

              <div className="flex items-start gap-3">
                <Image src="/icons/lock.png" alt="lock" width={16} height={16} className="object-contain opacity-30 mt-0.5 flex-shrink-0" />
                <p className="text-xs italic leading-relaxed" style={{ color:'#6B9FFF60' }}>
                  This session is end-to-end encrypted. Unauthorised access is a violation of Candoxa's terms.
                </p>
              </div>
            </div>
          </>
        ) : (
          /* ── Success state ── */
          <div className="p-8 md:p-10 text-center" style={cardStyle}>
            <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B9FFF" strokeWidth="2" strokeLinecap="round" className="w-8 h-8">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 className="text-white text-2xl font-bold italic mb-1">
              Access <span style={{ color:'#6B9FFF' }}>Granted</span>
            </h2>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color:'#6B9FFF' }}>
              Identity Verified · Session Active
            </p>
            <p className="text-sm italic mb-6" style={{ color:'#6B9FFF80' }}>
              Welcome back, {adminInfo?.role === 'super_admin' ? 'Super Admin' : 'Admin'}. Redirecting to dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin" />
              Loading dashboard
            </div>
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