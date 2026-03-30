// app/settings/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter }                    from 'next/navigation'
import { supabase }                     from '@/lib/supabase'
import DashboardLayout                  from '@/components/dashboard/DashboardLayout'
import Image                            from 'next/image'

type DesktopTab = 'profile' | 'security' | 'notifications' | 'identity' | 'billing' | 'integrations'
type MobilePage = 'main' | 'edit-profile' | 'security' | 'privacy' | 'notifications' | 'billing' | 'platforms' | 'feedback' | 'permanent-record' | 'change-email' | 'change-password'

// ─── Theme helpers ────────────────────────────────────────────────────────────
function getTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('candoxa_theme') as 'dark' | 'light') || 'dark'
}
function applyTheme(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('candoxa_theme', theme)
}

// ─── Small shared components ──────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? '#0038FF' : 'rgba(255,255,255,0.12)' }}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  )
}

function BackButton({ onBack, title, action }: { onBack: () => void; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="text-white text-[18px] font-bold">{title}</h1>
      </div>
      {action}
    </div>
  )
}

function SettingsRow({ icon, label, sub, value, onPress, toggle, toggleOn, onToggle, danger = false }: {
  icon: React.ReactNode; label: string; sub?: string; value?: string
  onPress?: () => void; toggle?: boolean; toggleOn?: boolean; onToggle?: (v: boolean) => void; danger?: boolean
}) {
  return (
    <div onClick={!toggle ? onPress : undefined}
      className={`flex items-center gap-3 px-4 py-3.5 ${onPress && !toggle ? 'cursor-pointer active:bg-white/[0.04]' : ''}`}>
      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium ${danger ? 'text-red-400' : 'text-white/80'}`}>{label}</p>
        {sub && <p className={`text-[11px] mt-0.5 ${danger ? 'text-red-400/60' : 'text-white/35'}`}>{sub}</p>}
      </div>
      {value && <span className="text-white/40 text-[12px] flex-shrink-0 mr-1">{value}</span>}
      {toggle && onToggle && <Toggle on={!!toggleOn} onChange={onToggle} />}
      {!toggle && onPress && <ChevronRight />}
    </div>
  )
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-white/40 text-[12px] font-semibold uppercase tracking-[0.10em] px-1 mb-2">{title}</p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">{children}</div>
    </div>
  )
}

function ConfirmSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0D0D14] border border-white/[0.10] border-b-0 rounded-t-[20px] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        {children}
      </div>
    </>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, disabled }: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; disabled?: boolean
}) {
  return (
    <div className="mb-4">
      <label className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.10em] block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full bg-[#111118] border border-white/[0.10] rounded-xl px-4 py-3 text-white/80 text-[14px] outline-none focus:border-white/20 placeholder-white/25 disabled:text-white/30 disabled:cursor-not-allowed" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [user,    setUser]    = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [mobilePage,  setMobilePage]  = useState<MobilePage>('main')
  const [desktopTab,  setDesktopTab]  = useState<DesktopTab>('profile')

  // Profile
  const [displayName, setDisplayName] = useState('')
  const [bio,         setBio]         = useState('')
  const [locationVal, setLocationVal] = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [avatarFile,  setAvatarFile]  = useState<File | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Security
  const [newEmail,       setNewEmail]       = useState('')
  const [emailMsg,       setEmailMsg]       = useState('')
  const [currentPwd,     setCurrentPwd]     = useState('')
  const [newPwd,         setNewPwd]         = useState('')
  const [confirmPwd,     setConfirmPwd]     = useState('')
  const [pwdMsg,         setPwdMsg]         = useState('')
  const [twoFA,          setTwoFA]          = useState(false)
  const [sessions,       setSessions]       = useState<any[]>([])

  // Notifications
  const [notifs, setNotifs] = useState({
    new_tracker: false, entry_secured: false, milestone: false,
    referral: false, weekly_digest: false, product_updates: false,
    push: false, email: false,
  })

  // Privacy
  const [privacy, setPrivacy] = useState({ is_public: true, show_in_discover: true, allow_tracking: true })

  // Appearance
  const [theme,        setTheme]        = useState<'dark'|'light'>('dark')
  const [reduceMotion, setReduceMotion] = useState(false)

  // Feedback
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  // Sheets
  const [showLogout,     setShowLogout]     = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showDelete,     setShowDelete]     = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState('')

  // Integrations
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    'X (Twitter)': false, LinkedIn: false, YouTube: false,
    Substack: false, Medium: false, TikTok: false,
  })

  useEffect(() => {
    setTheme(getTheme())
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      const { data: p } = await supabase.from('users').select('*').eq('email', session.user.email).single()
      if (p) {
        setProfile(p)
        setDisplayName(p.display_name || '')
        setBio(p.bio || '')
        setLocationVal(p.location || '')
        setAvatarUrl(p.avatar_url || null)
        if (p.notification_prefs) setNotifs(prev => ({ ...prev, ...p.notification_prefs }))
        if (p.identity_prefs)     setPrivacy(prev => ({ ...prev, ...p.identity_prefs }))
        if (p.integrations)       setIntegrations(p.integrations)

        const { data: sess } = await supabase.from('user_sessions')
          .select('*').eq('user_id', p.id).order('last_active', { ascending: false })
        setSessions(sess || [])

        const ua     = navigator.userAgent
        const device = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : 'Desktop'
        await supabase.from('user_sessions').upsert({
          user_id:     p.id,
          device_name: device,
          device_type: /Mobile|Android|iPhone/.test(ua) ? 'mobile' : 'desktop',
          last_active: new Date().toISOString(),
        }, { onConflict: 'user_id,device_name' })
      }
      setLoading(false)
    })
  }, [])

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    let url = avatarUrl
    if (avatarFile) {
      const ext  = avatarFile.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        url = `${data.publicUrl}?t=${Date.now()}`
        setAvatarUrl(url); setAvatarFile(null)
      }
    }
    await supabase.from('users').update({ display_name: displayName, bio, location: locationVal, avatar_url: url }).eq('id', profile.id)
    setProfile({ ...profile, display_name: displayName, bio, location: locationVal, avatar_url: url })
    setSaving(false); setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const updateEmail = async () => {
    if (!newEmail.trim()) return
    setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) setEmailMsg('Error: ' + error.message)
    else { setEmailMsg('Confirmation sent to ' + newEmail + '. Check your inbox.'); setNewEmail('') }
  }

  const updatePassword = async () => {
    setPwdMsg('')
    if (!newPwd || newPwd !== confirmPwd) { setPwdMsg('Passwords do not match'); return }
    if (newPwd.length < 6) { setPwdMsg('Password must be at least 6 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) setPwdMsg('Error: ' + error.message)
    else { setPwdMsg('Password updated successfully'); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('') }
    setTimeout(() => setPwdMsg(''), 3000)
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); applyTheme(next)
  }

  const savePrivacyUpdate = async (updated: typeof privacy) => {
    setPrivacy(updated)
    await supabase.from('users').update({ identity_prefs: updated }).eq('id', profile?.id)
  }

  const saveNotifs = async (updated: typeof notifs) => {
    setNotifs(updated)
    await supabase.from('users').update({ notification_prefs: updated }).eq('id', profile?.id)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/onboarding') }
  const handleDeactivate = async () => {
    if (!profile) return
    await supabase.from('users').update({ is_active: false }).eq('id', profile.id)
    await supabase.auth.signOut(); router.push('/onboarding')
  }
  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE' || !profile) return
    await supabase.from('entries').update({ user_id: null }).eq('user_id', profile.id)
    await supabase.from('users').delete().eq('id', profile.id)
    await supabase.auth.signOut(); router.push('/onboarding')
  }
  const sendFeedback = async () => {
    if (!feedbackText.trim() || !profile) return
    await supabase.from('feedback').insert({ user_id: profile.id, message: feedbackText })
    setFeedbackText(''); setFeedbackSent(true)
    setTimeout(() => { setFeedbackSent(false); setMobilePage('main') }, 1500)
  }

  const initials      = (profile?.username || 'U')[0].toUpperCase()
  const palette       = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const avatarBg      = palette[initials.charCodeAt(0) % palette.length]
  const displayAvatar = (avatarFile ? URL.createObjectURL(avatarFile) : null) || avatarUrl

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  // ─── Shared notification items list ──────────────────────────────────────────
  const NOTIF_ITEMS = [
    { key: 'new_tracker',     label: 'New Tracker',                desc: 'Someone started tracking your profile.' },
    { key: 'entry_secured',   label: 'Entry Secured Confirmation', desc: 'Email confirmation each time an entry is anchored.' },
    { key: 'milestone',       label: 'Milestone Unlocked',         desc: 'Notify when you reach a new milestone or badge.' },
    { key: 'referral',        label: 'Referral Joined',            desc: 'A creator you referred has joined Candoxa.' },
    { key: 'weekly_digest',   label: 'Weekly Digest',              desc: 'A weekly summary of your growth and activity.' },
    { key: 'product_updates', label: 'Product Updates',            desc: 'New features and announcements from Candoxa.' },
  ]

  // ════════════════════════════════════════════════════════════
  //  MOBILE sub-pages
  // ════════════════════════════════════════════════════════════

  const MobileEditProfile = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="Edit Profile"
        action={
          <button onClick={saveProfile} disabled={saving}
            className="px-5 py-2 rounded-full text-white text-[13px] font-semibold disabled:opacity-50"
            style={{ background:'#0038FF' }}>
            {profileSaved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
          </button>
        }
      />
      <div className="flex flex-col items-center mb-8">
        <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/[0.07] border border-white/[0.10] flex items-center justify-center">
            {displayAvatar
              ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
              : <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" className="w-10 h-10"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            }
          </div>
          <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#0038FF] border-2 border-black flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarFile(f) }} />
      </div>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
        <div className="px-4 py-3.5">
          <p className="text-white/55 text-[11px] mb-1">Display Name</p>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-transparent text-white/80 text-[14px] outline-none placeholder-white/25"
            placeholder="Your display name" />
        </div>
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white/55 text-[11px]">Username</p>
            <span className="text-[#6B8AFF] text-[10px] font-bold tracking-wide">PERMANENT</span>
          </div>
          <p className="text-white/55 text-[14px]">@{profile?.username}</p>
          <p className="text-[#6B8AFF] text-[11px] mt-1">Your handle cannot be changed.</p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-white/55 text-[11px] mb-1.5">Bio</p>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
            placeholder="Creator building in public..."
            className="w-full bg-transparent text-white/75 text-[14px] outline-none resize-none placeholder-white/25 leading-relaxed" />
        </div>
        <div className="px-4 py-3.5">
          <p className="text-white/55 text-[11px] mb-1">Location</p>
          <input value={locationVal} onChange={(e) => setLocationVal(e.target.value)}
            className="w-full bg-transparent text-white/75 text-[14px] outline-none placeholder-white/25"
            placeholder="Lagos, Nigeria" />
        </div>
      </div>
    </div>
  )

  const MobileChangeEmail = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('security')} title="Change Email" />
      <p className="text-white/40 text-[13px] mb-5 leading-relaxed">
        A confirmation link will be sent to your new address. Your current email stays active until confirmed.
      </p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06] mb-5">
        <div className="px-4 py-3.5">
          <p className="text-white/45 text-[11px] mb-1">Current Email</p>
          <p className="text-white/50 text-[14px]">{user?.email}</p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-white/45 text-[11px] mb-1">New Email</p>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            placeholder="newaddress@example.com"
            className="w-full bg-transparent text-white/80 text-[14px] outline-none placeholder-white/25" />
        </div>
      </div>
      {emailMsg && (
        <p className={`text-[12px] mb-4 ${emailMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{emailMsg}</p>
      )}
      <button onClick={updateEmail} disabled={!newEmail.trim()}
        className="w-full py-4 rounded-xl text-white text-[14px] font-semibold disabled:opacity-40"
        style={{ background:'#0038FF' }}>
        Send Confirmation
      </button>
    </div>
  )

  const MobileChangePassword = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('security')} title="Change Password" />
      <p className="text-white/40 text-[13px] mb-5 leading-relaxed">
        Use a strong password with at least 8 characters including numbers and symbols.
      </p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06] mb-5">
        <div className="px-4 py-3.5">
          <p className="text-white/45 text-[11px] mb-1">New Password</p>
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-transparent text-white/80 text-[14px] outline-none placeholder-white/25" />
        </div>
        <div className="px-4 py-3.5">
          <p className="text-white/45 text-[11px] mb-1">Confirm Password</p>
          <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-transparent text-white/80 text-[14px] outline-none placeholder-white/25" />
        </div>
      </div>
      {pwdMsg && (
        <p className={`text-[12px] mb-4 ${pwdMsg.startsWith('Error') || pwdMsg.includes('match') || pwdMsg.includes('least') ? 'text-red-400' : 'text-green-400'}`}>{pwdMsg}</p>
      )}
      <button onClick={updatePassword} disabled={!newPwd || !confirmPwd}
        className="w-full py-4 rounded-xl text-white text-[14px] font-semibold disabled:opacity-40"
        style={{ background:'#0038FF' }}>
        Update Password
      </button>
    </div>
  )

  const MobileSecurity = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="Security & Login" />
      <SectionGroup title="Authentication">
        <SettingsRow
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          label="Change Email" sub={user?.email} onPress={() => setMobilePage('change-email')}
        />
        <SettingsRow
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>}
          label="Change Password" onPress={() => setMobilePage('change-password')}
        />
        <SettingsRow
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/></svg>}
          label="Two-Factor Authentication" sub="Protect your account with 2FA"
          toggle toggleOn={twoFA} onToggle={setTwoFA}
        />
      </SectionGroup>
      <p className="text-white/40 text-[12px] font-semibold uppercase tracking-[0.10em] px-1 mb-2">Active Sessions</p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
        {sessions.length === 0
          ? <p className="text-white/25 text-[13px] px-4 py-4">No sessions found.</p>
          : sessions.map((s, i) => (
            <div key={s.id || i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                {s.device_type === 'mobile'
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-[13px] font-medium">{s.device_name}</p>
                <p className="text-white/35 text-[11px]">{s.location || 'Unknown'} · {new Date(s.last_active).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</p>
              </div>
              {/* Fixed: first session = This Device, rest = Other */}
              <span className="text-[11px] font-semibold" style={{ color: i === 0 ? '#4ade80' : '#f87171' }}>
                {i === 0 ? 'This Device' : 'Other'}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  )

  const MobilePrivacy = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="Privacy & Visibility" />
      <div className="border border-white/[0.08] bg-[#0A0A0F] rounded-2xl p-4 flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <p className="text-white font-semibold text-[13px]">Your identity is permanent</p>
          <p className="text-white/40 text-[12px] mt-1 leading-relaxed">Visibility only controls who can discover you. Entries remain secured regardless.</p>
        </div>
      </div>
      <p className="text-white font-semibold text-[14px] mb-3">Profile visibility</p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06] mb-5">
        {[
          { val: true,  label: 'Public',  sub: 'Anyone can discover and view your profile' },
          { val: false, label: 'Private', sub: 'Only people you approve can view your profile' },
        ].map(({ val, label, sub }) => (
          <div key={label} onClick={() => savePrivacyUpdate({ ...privacy, is_public: val })}
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
            <div className="flex-1">
              <p className="text-white/80 text-[13px] font-medium">{label}</p>
              <p className="text-white/35 text-[11px]">{sub}</p>
            </div>
            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: privacy.is_public === val ? '#0038FF' : 'rgba(255,255,255,0.25)' }}>
              {privacy.is_public === val && <div className="w-2.5 h-2.5 rounded-full" style={{ background:'#0038FF' }} />}
            </div>
          </div>
        ))}
      </div>
      <p className="text-white font-semibold text-[14px] mb-3">Control</p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
        <SettingsRow
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          label="Show in Discover" sub="Appear on the public Discover feed"
          toggle toggleOn={privacy.show_in_discover}
          onToggle={(v) => savePrivacyUpdate({ ...privacy, show_in_discover: v })}
        />
        <SettingsRow
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
          label="Allow Tracking" sub="Let others track your profile"
          toggle toggleOn={privacy.allow_tracking}
          onToggle={(v) => savePrivacyUpdate({ ...privacy, allow_tracking: v })}
        />
      </div>
    </div>
  )

  const MobilePlatforms = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="Connected Platforms" />
      <p className="text-white/40 text-[13px] mb-5 leading-relaxed">
        Connect platforms to auto-fill content URLs when securing entries.
      </p>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
        {Object.entries(integrations).map(([platform, connected]) => (
          <div key={platform} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-[13px] font-medium">{platform}</p>
              <p className={`text-[11px] mt-0.5 ${connected ? 'text-green-400' : 'text-white/30'}`}>
                {connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <button
              onClick={() => {
                const u = { ...integrations, [platform]: !connected }
                setIntegrations(u)
                supabase.from('users').update({ integrations: u }).eq('id', profile?.id)
              }}
              className="px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors"
              style={connected
                ? { borderColor:'rgba(239,68,68,0.3)', color:'rgba(239,68,68,0.7)' }
                : { borderColor:'rgba(0,56,255,0.4)', color:'#6B8AFF' }
              }>
              {connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const MobileBilling = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="Plan & Billing" />
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-white font-semibold text-[15px]">Free Plan</p>
          <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">Current</span>
        </div>
        <p className="text-white/35 text-[12px]">10 daily secures · Public profile · Basic identity features</p>
      </div>
      <div className="bg-[#0A0A0F] border border-blue-500/30 rounded-2xl overflow-hidden mb-5">
        <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-[15px]">Pro Plan</p>
            <p className="text-white/35 text-[12px]">Everything in Free, plus advanced features.</p>
          </div>
          <span className="text-white font-bold text-[15px]">$9/mo</span>
        </div>
        {['Unlimited daily secures', 'Priority verification', 'Advanced analytics', 'Custom profile badge'].map((f) => (
          <div key={f} className="px-4 py-3 border-b border-white/[0.06] last:border-0 flex items-center gap-2.5">
            <span className="text-green-400 text-[12px]">✓</span>
            <p className="text-white/70 text-[13px]">{f}</p>
          </div>
        ))}
      </div>
      <button className="w-full py-4 rounded-xl text-white text-[14px] font-semibold" style={{ background:'#0038FF' }}>
        Upgrade to Pro
      </button>
    </div>
  )

  const MobilePermanentRecord = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="My Permanent Record" />
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4 mb-5">
        <p className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.10em] mb-3">Record Summary</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Entries', val: String(profile?.entry_count || 0) },
            { label: 'Profile Strength', val: String(profile?.profile_strength || 0) + 'pts' },
            { label: 'Member Since', val: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
            { label: 'Visibility', val: privacy.is_public ? 'Public' : 'Private' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] rounded-xl px-3 py-3">
              <p className="text-white/35 text-[10px] mb-1">{s.label}</p>
              <p className="text-white font-semibold text-[14px]">{s.val}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4">
        <p className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.10em] mb-2">What is Permanent?</p>
        <p className="text-white/50 text-[13px] leading-relaxed">
          All secured entries are timestamped on-chain and cannot be deleted or altered. Even if your account is deactivated, the cryptographic proof of your work remains verifiable forever.
        </p>
        <button onClick={() => router.push(`/${profile?.username}`)}
          className="mt-4 w-full py-3 rounded-xl border border-white/[0.12] text-white/60 text-[13px] font-medium">
          View Public Profile →
        </button>
      </div>
    </div>
  )

  const MobileFeedback = () => (
    <div className="flex flex-col">
      <BackButton onBack={() => setMobilePage('main')} title="Send Feedback" />
      <p className="text-white/40 text-[13px] mb-5 leading-relaxed">Tell us what's working, what's broken, or what you'd love to see on Candoxa.</p>
      <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={6}
        placeholder="Your feedback..."
        className="w-full bg-[#0A0A0F] border border-white/[0.10] rounded-2xl px-4 py-4 text-white/75 text-[14px] outline-none resize-none placeholder-white/25 leading-relaxed mb-5 focus:border-white/20"
      />
      <div className="flex gap-3">
        <button onClick={() => setMobilePage('main')}
          className="flex-1 py-3.5 rounded-xl border border-white/[0.12] text-white/60 text-[14px] font-semibold">Cancel</button>
        <button onClick={sendFeedback} disabled={!feedbackText.trim()}
          className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold disabled:opacity-40"
          style={{ background:'#0038FF' }}>
          {feedbackSent ? 'Sent!' : 'Send'}
        </button>
      </div>
    </div>
  )

  const MobileMain = () => (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/profile')} className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="text-white text-[20px] font-bold">Settings</h1>
      </div>

      <div onClick={() => setMobilePage('edit-profile')}
        className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3 mb-5 cursor-pointer">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          {displayAvatar
            ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
            : <div className={`w-full h-full flex items-center justify-center ${avatarBg}`}>
                <span className="text-white text-[16px] font-bold">{initials}</span>
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[15px]">{profile?.display_name || profile?.username}</p>
          <p className="text-[#6B8AFF] text-[12px]">@{profile?.username}</p>
          <p className="text-white/35 text-[11px] mt-0.5">Tap to edit your profile</p>
        </div>
        <ChevronRight />
      </div>

      <SectionGroup title="Account">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
          label="Personal Information" sub="Update your profile details" onPress={() => setMobilePage('edit-profile')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          label="Email Address" sub={user?.email} onPress={() => setMobilePage('change-email')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>}
          label="Security & Login" sub="Password, 2FA, active sessions" onPress={() => setMobilePage('security')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>}
          label="Connected Platforms" sub="X, YouTube, GitHub, LinkedIn…" onPress={() => setMobilePage('platforms')} />
      </SectionGroup>

      <SectionGroup title="Identity & Record">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          label="Privacy & Visibility" sub="Who can see your profile and entries"
          value={privacy.is_public ? 'Public' : 'Private'} onPress={() => setMobilePage('privacy')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>}
          label="My Permanent Record" sub="All secured entries · All indelible"
          value="Public" onPress={() => setMobilePage('permanent-record')} />
      </SectionGroup>

      <SectionGroup title="Notifications">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
          label="Notification Preferences" sub="New entries, trackers, milestones" onPress={() => setMobilePage('notifications')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2"/></svg>}
          label="Push Notifications" sub="Real-time alerts on your phone"
          toggle toggleOn={notifs.push} onToggle={(v) => saveNotifs({ ...notifs, push: v })} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          label="Email Notifications" sub="Weekly summary of your record"
          toggle toggleOn={notifs.email} onToggle={(v) => saveNotifs({ ...notifs, email: v })} />
      </SectionGroup>

      <SectionGroup title="Plans & Billing">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
          label="Current Plan" sub={`${profile?.plan === 'pro' ? 'Pro' : 'Free'} — ${profile?.plan === 'pro' ? 'Unlimited' : '10'} secures/day`}
          onPress={() => setMobilePage('billing')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>}
          label="Referrals" sub="Invite builders to Candoxa" onPress={() => router.push('/growth')} />
      </SectionGroup>

      <SectionGroup title="Appearance">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
          label="Theme" sub={theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
          value={theme === 'dark' ? 'Dark' : 'Light'} onPress={toggleTheme} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          label="Reduce Motion" toggle toggleOn={reduceMotion} onToggle={setReduceMotion} />
      </SectionGroup>

      <SectionGroup title="Support">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2"/></svg>}
          label="Help Centre" onPress={() => window.open('https://candoxa.vercel.app', '_blank')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          label="Send Feedback" onPress={() => setMobilePage('feedback')} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          label="Terms & Privacy Policy" onPress={() => window.open('https://candoxa.vercel.app/terms', '_blank')} />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-white/80 text-[14px] font-medium">App Version</p>
            <p className="text-white/35 text-[11px]">v1.0.0</p>
          </div>
        </div>
      </SectionGroup>

      <SectionGroup title="Account Actions">
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
          label="Log Out" onPress={() => setShowLogout(true)} />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>}
          label="Deactivate Account" sub="Hide your profile temporarily" onPress={() => setShowDeactivate(true)} danger />
        <SettingsRow icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>}
          label="Delete Account" sub="Permanently remove all your data" onPress={() => setShowDelete(true)} danger />
      </SectionGroup>
      <div className="h-8" />
    </div>
  )

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <DashboardLayout user={user}>

      {/* ═══════ MOBILE ═══════ */}
      <div className="md:hidden">
        {mobilePage === 'main'             && <MobileMain />}
        {mobilePage === 'edit-profile'     && <MobileEditProfile />}
        {mobilePage === 'security'         && <MobileSecurity />}
        {mobilePage === 'change-email'     && <MobileChangeEmail />}
        {mobilePage === 'change-password'  && <MobileChangePassword />}
        {mobilePage === 'privacy'          && <MobilePrivacy />}
        {mobilePage === 'platforms'        && <MobilePlatforms />}
        {mobilePage === 'billing'          && <MobileBilling />}
        {mobilePage === 'permanent-record' && <MobilePermanentRecord />}
        {mobilePage === 'feedback'         && <MobileFeedback />}
        {mobilePage === 'notifications' && (
          <div className="flex flex-col">
            <BackButton onBack={() => setMobilePage('main')} title="Notifications" />
            <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
              {NOTIF_ITEMS.map((item) => (
                <SettingsRow key={item.key}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
                  label={item.label} sub={item.desc}
                  toggle toggleOn={notifs[item.key as keyof typeof notifs] as boolean}
                  onToggle={(v) => saveNotifs({ ...notifs, [item.key]: v })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ DESKTOP ═══════ */}
      <div className="hidden md:block">
        <div className="mb-6">
          <h1 className="text-white text-[24px] font-bold tracking-tight">Settings</h1>
          <p className="text-white/40 text-[14px] mt-1">Manage your account, identity, and preferences.</p>
        </div>

        <div className="flex gap-5 items-start">
          <div className="flex-shrink-0 w-[260px] border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-3">
            {([
              { key: 'profile',       label: 'My Profile' },
              { key: 'security',      label: 'Account & Security' },
              { key: 'notifications', label: 'Notifications' },
              { key: 'identity',      label: 'Identity' },
              { key: 'billing',       label: 'Plan & Billing' },
              { key: 'integrations',  label: 'Integrations' },
            ] as {key: DesktopTab; label: string}[]).map((t) => (
              <button key={t.key} onClick={() => setDesktopTab(t.key)}
                className={`w-full flex items-center px-3 py-3 rounded-xl text-[13px] font-medium transition-all text-left mb-0.5
                  ${desktopTab === t.key ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-6">

            {/* Profile tab */}
            {desktopTab === 'profile' && (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-5">
                  <div>
                    <p className="text-white font-semibold text-[15px]">Profile Information</p>
                    <p className="text-white/35 text-[12px] mt-0.5">Manage your public identity on Candoxa.</p>
                  </div>
                  <button onClick={saveProfile}
                    className="px-5 py-2 rounded-xl text-white text-[13px] font-semibold" style={{ background:'#0038FF' }}>
                    {profileSaved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
                <div className="flex items-center gap-5 mb-6">
                  <div onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-full overflow-hidden cursor-pointer bg-white/[0.07] border border-white/[0.10] flex items-center justify-center hover:border-white/20 transition-colors flex-shrink-0">
                    {displayAvatar
                      ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                      : <div className={`w-full h-full flex items-center justify-center ${avatarBg}`}><span className="text-white text-2xl font-bold">{initials}</span></div>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarFile(f) }} />
                  <div>
                    <p className="text-white font-medium text-[14px]">Profile Photo</p>
                    <p className="text-white/35 text-[12px] mt-0.5 mb-3">Appears on your public profile and identity records.</p>
                    <button onClick={() => fileRef.current?.click()}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.10] transition-colors">
                      Upload Photo
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <InputField label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your display name" />
                  <InputField label="Username" value={profile?.username ? `@${profile.username}` : ''} disabled />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color:'#6B8AFF' }}>Bio</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell the world about yourself..."
                      className="w-full bg-[#111118] border border-white/[0.10] rounded-xl px-4 py-3 text-white/80 text-[14px] outline-none resize-none focus:border-white/20 placeholder-white/20" />
                  </div>
                  <InputField label="Location" value={locationVal} onChange={setLocationVal} placeholder="Lagos, Nigeria" />
                </div>
              </div>
            )}

            {/* Security tab */}
            {desktopTab === 'security' && (
              <div className="space-y-7">
                {/* Change Email */}
                <div>
                  <p className="text-white font-semibold text-[15px] pb-4 border-b border-white/[0.07] mb-5">Email Address</p>
                  <InputField label="Current Email" value={user?.email || ''} disabled />
                  <InputField label="New Email" value={newEmail} onChange={setNewEmail} type="email" placeholder="newaddress@example.com" />
                  {emailMsg && <p className={`text-[12px] mb-3 ${emailMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{emailMsg}</p>}
                  <button onClick={updateEmail} disabled={!newEmail.trim()}
                    className="px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-40" style={{ background:'#0038FF' }}>
                    Send Confirmation
                  </button>
                </div>

                {/* Change Password */}
                <div>
                  <p className="text-white font-semibold text-[15px] pb-4 border-b border-white/[0.07] mb-5">Change Password</p>
                  <InputField label="New Password" value={newPwd} onChange={setNewPwd} type="password" placeholder="••••••••" />
                  <InputField label="Confirm Password" value={confirmPwd} onChange={setConfirmPwd} type="password" placeholder="••••••••" />
                  {pwdMsg && <p className={`text-[12px] mb-3 ${pwdMsg.startsWith('Error') || pwdMsg.includes('match') || pwdMsg.includes('least') ? 'text-red-400' : 'text-green-400'}`}>{pwdMsg}</p>}
                  <button onClick={updatePassword} disabled={!newPwd || !confirmPwd}
                    className="px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-40" style={{ background:'#0038FF' }}>
                    Update Password
                  </button>
                </div>

                {/* Active Sessions */}
                <div>
                  <p className="text-white font-semibold text-[15px] pb-4 border-b border-white/[0.07] mb-5">Active Sessions</p>
                  <div className="space-y-3">
                    {sessions.length === 0 ? <p className="text-white/25 text-[13px]">No sessions found.</p>
                      : sessions.map((s, i) => (
                        <div key={s.id||i} className="flex items-center gap-3 border border-white/[0.08] rounded-xl px-4 py-3.5">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            {s.device_type === 'mobile'
                              ? <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                              : <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                            }
                          </div>
                          <div className="flex-1">
                            <p className="text-white/80 text-[13px] font-medium">{s.device_name}</p>
                            <p className="text-white/35 text-[11px]">{s.location||'Unknown'} · {new Date(s.last_active).toLocaleDateString()}</p>
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: i===0 ? '#4ade80' : '#f87171' }}>
                            {i===0 ? 'This Device' : 'Other'}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Notifications tab */}
            {desktopTab === 'notifications' && (
              <div>
                <div className="pb-4 border-b border-white/[0.07] mb-5">
                  <p className="text-white font-semibold text-[15px]">Notification Preferences</p>
                  <p className="text-white/35 text-[12px] mt-0.5">Control what Candoxa sends you.</p>
                </div>
                {NOTIF_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
                    <div>
                      <p className="text-white/80 text-[13px] font-medium">{item.label}</p>
                      <p className="text-white/35 text-[11px] mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle on={notifs[item.key as keyof typeof notifs] as boolean}
                      onChange={(v) => saveNotifs({ ...notifs, [item.key]: v })} />
                  </div>
                ))}
                <div className="pt-4 border-t border-white/[0.07] mt-2 space-y-4">
                  {[
                    { key: 'push',  label: 'Push Notifications',  desc: 'Real-time alerts on your device.' },
                    { key: 'email', label: 'Email Notifications',  desc: 'Receive updates via email.' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-[13px] font-medium">{item.label}</p>
                        <p className="text-white/35 text-[11px] mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle on={notifs[item.key as keyof typeof notifs] as boolean}
                        onChange={(v) => saveNotifs({ ...notifs, [item.key]: v })} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Identity tab */}
            {desktopTab === 'identity' && (
              <div>
                <div className="pb-4 border-b border-white/[0.07] mb-5">
                  <p className="text-white font-semibold text-[15px]">Identity Visibility</p>
                  <p className="text-white/35 text-[12px] mt-0.5">Control how your profile appears on Candoxa.</p>
                </div>
                {[
                  { key: 'is_public',        label: 'Public Profile',   desc: `Anyone can view your profile at candoxa.com/@${profile?.username||'you'}` },
                  { key: 'show_in_discover', label: 'Show in Discover', desc: 'Your profile appears in the Discover directory.' },
                  { key: 'allow_tracking',   label: 'Allow Tracking',   desc: 'Other creators can track your profile activity.' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
                    <div>
                      <p className="text-white/80 text-[13px] font-medium">{item.label}</p>
                      <p className="text-white/35 text-[11px] mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle on={privacy[item.key as keyof typeof privacy]}
                      onChange={(v) => savePrivacyUpdate({ ...privacy, [item.key]: v })} />
                  </div>
                ))}

                {/* Theme on desktop */}
                <div className="flex items-center justify-between py-4 border-t border-white/[0.07] mt-2">
                  <div>
                    <p className="text-white/80 text-[13px] font-medium">Theme</p>
                    <p className="text-white/35 text-[11px] mt-0.5">{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</p>
                  </div>
                  <button onClick={toggleTheme}
                    className="px-4 py-2 rounded-xl border border-white/[0.12] text-white/60 text-[12px] font-medium hover:bg-white/[0.04] transition-colors">
                    Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>
              </div>
            )}

            {/* Billing tab */}
            {desktopTab === 'billing' && (
              <div>
                <p className="text-white font-semibold text-[15px] pb-4 border-b border-white/[0.07] mb-5">Plan & Billing</p>
                <div className="border border-white/[0.08] rounded-xl px-4 py-3.5 mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-[14px]">{profile?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</p>
                    <p className="text-white/35 text-[12px] mt-0.5">{profile?.plan === 'pro' ? 'Unlimited secures · All features' : '10 daily secures · Public profile · Basic features'}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">Current</span>
                </div>
                {profile?.plan !== 'pro' && (
                  <div className="border border-blue-500/25 rounded-xl overflow-hidden">
                    <div className="px-4 py-4 border-b border-white/[0.07] flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold text-[14px]">Pro Plan</p>
                        <p className="text-white/35 text-[12px]">Everything in Free, plus advanced features.</p>
                      </div>
                      <span className="text-white/50 text-[13px] font-semibold">$9/mo</span>
                    </div>
                    {['Unlimited daily secures', 'Priority verification', 'Advanced analytics', 'Custom profile badge'].map((f) => (
                      <div key={f} className="px-4 py-3.5 border-b border-white/[0.07] last:border-0 flex items-center gap-2">
                        <span className="text-green-400 text-[12px]">✓</span>
                        <p className="text-white/75 text-[13px]">{f}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button className="w-full mt-5 py-3.5 rounded-xl text-white text-[14px] font-semibold" style={{ background:'#0038FF' }}>
                  {profile?.plan === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
                </button>
              </div>
            )}

            {/* Integrations tab */}
            {desktopTab === 'integrations' && (
              <div>
                <div className="pb-4 border-b border-white/[0.07] mb-5">
                  <p className="text-white font-semibold text-[15px]">Connected Platforms</p>
                  <p className="text-white/35 text-[12px] mt-0.5">Connect platforms to auto-fill content URLs when securing.</p>
                </div>
                {Object.entries(integrations).map(([platform, connected]) => (
                  <div key={platform} className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
                    <div>
                      <p className="text-white/80 text-[13px] font-medium">{platform}</p>
                      <p className={`text-[11px] mt-0.5 ${connected ? 'text-green-400' : 'text-white/30'}`}>{connected ? 'Connected' : 'Not connected'}</p>
                    </div>
                    <button
                      onClick={() => { const u = { ...integrations, [platform]: !connected }; setIntegrations(u); supabase.from('users').update({ integrations: u }).eq('id', profile?.id) }}
                      className="px-4 py-2 rounded-xl border border-white/[0.12] text-white/55 text-[12px] font-semibold hover:bg-white/[0.04] transition-colors">
                      {connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Danger zone - desktop */}
        <div className="mt-5 border border-red-500/20 bg-[#0A0A0F] rounded-2xl p-5">
          <p className="text-red-400 font-semibold text-[14px] mb-4">Danger Zone</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setShowLogout(true)}
              className="px-4 py-2.5 rounded-xl border border-white/[0.12] text-white/60 text-[13px] font-medium hover:bg-white/[0.04] transition-colors">
              Log Out
            </button>
            <button onClick={() => setShowDeactivate(true)}
              className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400/70 text-[13px] font-medium hover:bg-red-500/10 transition-colors">
              Deactivate Account
            </button>
            <button onClick={() => setShowDelete(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 text-[13px] font-medium hover:bg-red-600/30 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ SHEETS ═══════ */}
      <ConfirmSheet open={showLogout} onClose={() => setShowLogout(false)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background:'rgba(239,68,68,0.15)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="1.8" strokeLinecap="round" className="w-7 h-7">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <p className="text-white font-bold text-[17px] mb-1">Log out of Candoxa?</p>
          <p className="text-white/40 text-[13px] leading-relaxed mb-6">You'll need to sign in again. Your permanent record stays safe.</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setShowLogout(false)} className="flex-1 py-3.5 rounded-xl border border-white/[0.12] text-white/70 text-[14px] font-semibold">Cancel</button>
            <button onClick={handleLogout} className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold bg-red-500">Log Out</button>
          </div>
        </div>
      </ConfirmSheet>

      <ConfirmSheet open={showDeactivate} onClose={() => setShowDeactivate(false)}>
        <p className="text-white font-bold text-[17px] mb-2">Deactivate Account?</p>
        <p className="text-white/40 text-[13px] leading-relaxed mb-6">Your profile will be hidden from Discover and search. Your secured entries remain intact. You can reactivate at any time by logging back in.</p>
        <div className="flex gap-3">
          <button onClick={() => setShowDeactivate(false)} className="flex-1 py-3.5 rounded-xl border border-white/[0.12] text-white/70 text-[14px] font-semibold">Cancel</button>
          <button onClick={handleDeactivate} className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold bg-red-500">Deactivate</button>
        </div>
      </ConfirmSheet>

      <ConfirmSheet open={showDelete} onClose={() => setShowDelete(false)}>
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background:'rgba(239,68,68,0.15)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="1.8" strokeLinecap="round" className="w-7 h-7">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </div>
          <p className="text-white font-bold text-[17px] mb-1">Delete Account</p>
          <p className="text-red-400 text-[12px] font-semibold mb-2">This action is irreversible.</p>
          <p className="text-white/40 text-[13px] leading-relaxed">All your data, entries, and profile will be permanently deleted.</p>
        </div>
        <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="TYPE 'DELETE' to confirm"
          className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-3.5 text-white/80 text-[14px] outline-none mb-4 placeholder-white/25 focus:border-red-500/50"
        />
        <div className="flex gap-3">
          <button onClick={() => { setShowDelete(false); setDeleteConfirm('') }} className="flex-1 py-3.5 rounded-xl border border-white/[0.12] text-white/70 text-[14px] font-semibold">Cancel</button>
          <button onClick={handleDelete} disabled={deleteConfirm !== 'DELETE'} className="flex-1 py-3.5 rounded-xl text-white text-[14px] font-semibold disabled:opacity-40 bg-red-500">Delete</button>
        </div>
      </ConfirmSheet>

    </DashboardLayout>
  )
}