// app/settings/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

type Tab = 'profile' | 'security' | 'notifications' | 'identity' | 'billing' | 'integrations'

const Icons = {
  person: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  lock:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>,
  bell:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  card:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  share:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>,
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-white/[0.12]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', disabled = false, placeholder = '' }: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; disabled?: boolean; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: '#6B8AFF' }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled} placeholder={placeholder}
        className={`w-full bg-[#111118] border border-white/[0.10] rounded-xl px-4 py-3 text-[14px] outline-none transition-colors
          ${disabled ? 'text-white/35 cursor-not-allowed' : 'text-white/80 focus:border-white/20'}`}
      />
    </div>
  )
}

function SectionHeader({ title, subtitle, onSave }: { title: string; subtitle: string; onSave?: () => void }) {
  return (
    <div className="flex items-start justify-between pb-4 border-b border-white/[0.07] mb-5">
      <div>
        <p className="text-white font-semibold text-[15px]">{title}</p>
        <p className="text-white/35 text-[12px] mt-0.5">{subtitle}</p>
      </div>
      {onSave && (
        <button onClick={onSave} className="px-5 py-2 rounded-xl text-white text-[13px] font-semibold flex-shrink-0 hover:opacity-90 transition-opacity" style={{ background: '#0038FF' }}>
          Save Changes
        </button>
      )}
    </div>
  )
}

function ToggleRow({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
      <div>
        <p className="text-white/80 text-[13px] font-medium">{label}</p>
        <p className="text-white/35 text-[11px] mt-0.5">{desc}</p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

export default function SettingsPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [user,    setUser]    = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [tab,     setTab]     = useState<Tab>('profile')

  const [displayName, setDisplayName] = useState('')
  const [bio,         setBio]         = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [avatarFile,  setAvatarFile]  = useState<File | null>(null)

  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail,     setNewEmail]     = useState('')
  const [currentPwd,   setCurrentPwd]   = useState('')
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')

  const [notifs, setNotifs] = useState({
    new_tracker: false, entry_secured: false, milestone: false,
    referral: false, weekly_digest: false, product_updates: false,
  })

  const [identity, setIdentity] = useState({
    public_profile: false, show_in_discover: false,
    allow_tracking: false, show_tracker_count: false,
  })
  const [candoxaId, setCandoxaId] = useState('')
  const [copied,    setCopied]    = useState(false)

  const [integrations, setIntegrations] = useState<Record<string, string | null>>({
    'X (Twitter)': null, LinkedIn: null, YouTube: null,
    Substack: null, Medium: null, TikTok: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      setCurrentEmail(session.user.email || '')
      supabase.from('users').select('*').eq('email', session.user.email).single()
        .then(({ data }) => {
          if (!data) return
          setProfile(data)
          setDisplayName(data.display_name || '')
          setBio(data.bio || '')
          setAvatarUrl(data.avatar_url || null)
          setCandoxaId(data.candoxa_id || '')
          if (data.notification_prefs) setNotifs(data.notification_prefs)
          if (data.identity_prefs)     setIdentity(data.identity_prefs)
          if (data.integrations)       setIntegrations(data.integrations)
        })
    })
  }, [])

  const saveProfile = async () => {
    if (!profile) return
    let url = avatarUrl
    if (avatarFile) {
      const ext  = avatarFile.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        url = `${data.publicUrl}?t=${Date.now()}` // cache bust — forces browser to fetch new image on reload
        setAvatarUrl(url)  // update state so UI reflects immediately
        setAvatarFile(null) // clear file so re-save doesn't re-upload unnecessarily
      }
    }
    await supabase.from('users').update({ display_name: displayName, bio, avatar_url: url }).eq('id', profile.id)
  }

  const saveEmail = async () => {
    if (!newEmail) return
    await supabase.auth.updateUser({ email: newEmail })
  }

  const savePassword = async () => {
    if (!newPwd || newPwd !== confirmPwd) return
    await supabase.auth.updateUser({ password: newPwd })
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
  }

  const saveNotifs = async () => {
    if (!profile) return
    await supabase.from('users').update({ notification_prefs: notifs }).eq('id', profile.id)
  }

  const saveIdentity = async () => {
    if (!profile) return
    await supabase.from('users').update({ identity_prefs: identity }).eq('id', profile.id)
  }

  const copyId = () => {
    navigator.clipboard.writeText(candoxaId)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile',       label: 'My Profile',         icon: Icons.person },
    { key: 'security',      label: 'Account & Security',  icon: Icons.lock   },
    { key: 'notifications', label: 'Notifications',       icon: Icons.bell   },
    { key: 'identity',      label: 'Identity',            icon: Icons.shield },
    { key: 'billing',       label: 'Plan & Billing',      icon: Icons.card   },
    { key: 'integrations',  label: 'Integrations',        icon: Icons.share  },
  ]

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" /></div>

  return (
    <DashboardLayout user={user}>
      <div className="mb-6">
        <h1 className="text-white text-[24px] font-bold tracking-tight">Settings</h1>
        <p className="text-white/40 text-[14px] mt-1">Manage your account, identity, and preferences.</p>
      </div>

      <div className="flex gap-5 items-start">

        {/* Left sub-nav */}
        <div className="flex-shrink-0 w-[280px] border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-3">
          <p className="text-white/35 text-[10px] font-bold tracking-[0.14em] uppercase px-3 pt-2 pb-3">Creators You Track</p>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium transition-all text-left mb-0.5
                ${tab === t.key ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04]'}`}>
              <span className={tab === t.key ? 'text-white' : 'text-white/35'}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 border border-white/[0.10] bg-[#0A0A0F] rounded-2xl p-6">

          {/* MY PROFILE */}
          {tab === 'profile' && (
            <div>
              <SectionHeader title="Profile Information" subtitle="Manage your public identity on Candoxa." onSave={saveProfile} />
              <div className="flex items-center gap-5 mb-6">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center cursor-pointer overflow-hidden hover:border-white/20 transition-colors flex-shrink-0"
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" className="w-9 h-9"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  }
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)) }
                    }}
                  />
                </div>
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
                <Field label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your display name" />
                <div className="flex flex-col gap-1.5">
                  <Field label="Username" value={profile?.username ? `@${profile.username}` : ''} disabled />
                  <p className="text-white/25 text-[11px] pl-1">Username cannot be changed.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: '#6B8AFF' }}>Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell the world about yourself..."
                    className="w-full bg-[#111118] border border-white/[0.10] rounded-xl px-4 py-3 text-white/80 text-[14px] outline-none resize-none focus:border-white/20 transition-colors placeholder-white/20" />
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNT & SECURITY */}
          {tab === 'security' && (
            <div className="space-y-8">
              <div>
                <SectionHeader title="Email Address" subtitle="Your login and notification email." onSave={saveEmail} />
                <div className="space-y-4">
                  <Field label="Current Email" value={currentEmail} disabled />
                  <Field label="New Email" value={newEmail} onChange={setNewEmail} placeholder="Enter new email" type="email" />
                </div>
              </div>
              <div>
                <SectionHeader title="Password" subtitle="Change your account password." onSave={savePassword} />
                <div className="space-y-4">
                  <Field label="Current Password"    value={currentPwd} onChange={setCurrentPwd} type="password" placeholder="••••••••" />
                  <Field label="New Password"         value={newPwd}     onChange={setNewPwd}     type="password" placeholder="••••••••" />
                  <Field label="Confirm New Password" value={confirmPwd} onChange={setConfirmPwd} type="password" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <div className="pb-4 border-b border-white/[0.07] mb-5">
                  <p className="text-white font-semibold text-[15px]">Two-Factor Authentication</p>
                  <p className="text-white/35 text-[12px] mt-0.5">Add an extra layer of security to your account.</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/75 text-[13px] font-medium">Authenticator App</p>
                    <p className="text-white/35 text-[11px] mt-0.5">Use an authenticator app to generate one-time codes.</p>
                  </div>
                  <button className="px-4 py-2 rounded-xl border border-white/[0.12] text-white/55 text-[12px] font-medium hover:bg-white/[0.04] transition-colors">Set up</button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div>
              <SectionHeader title="Notification Preferences" subtitle="Control what Candoxa sends you." />
              <ToggleRow label="New Tracker"                desc="Someone started tracking your profile."            on={notifs.new_tracker}     onChange={(v) => { setNotifs(p=>({...p,new_tracker:v}));     saveNotifs() }} />
              <ToggleRow label="Entry Secured Confirmation" desc="Email confirmation each time an entry is anchored." on={notifs.entry_secured}   onChange={(v) => { setNotifs(p=>({...p,entry_secured:v}));   saveNotifs() }} />
              <ToggleRow label="Milestone Unlocked"         desc="Notify when you reach a new milestone or badge."    on={notifs.milestone}       onChange={(v) => { setNotifs(p=>({...p,milestone:v}));       saveNotifs() }} />
              <ToggleRow label="Referral Joined"            desc="A creator you referred has joined Candoxa."         on={notifs.referral}        onChange={(v) => { setNotifs(p=>({...p,referral:v}));        saveNotifs() }} />
              <ToggleRow label="Weekly Digest"              desc="A weekly summary of your growth and activity."      on={notifs.weekly_digest}   onChange={(v) => { setNotifs(p=>({...p,weekly_digest:v}));   saveNotifs() }} />
              <ToggleRow label="Product Updates"            desc="New features and announcements from Candoxa."       on={notifs.product_updates} onChange={(v) => { setNotifs(p=>({...p,product_updates:v})); saveNotifs() }} />
            </div>
          )}

          {/* IDENTITY */}
          {tab === 'identity' && (
            <div>
              <SectionHeader title="Identity Visibility" subtitle="Control how your profile appears on Candoxa." />
              <ToggleRow label="Public Profile"     desc={`Anyone can view your profile at candoxa.com/@${profile?.username || 'you'}`} on={identity.public_profile}     onChange={(v) => { setIdentity(p=>({...p,public_profile:v}));     saveIdentity() }} />
              <ToggleRow label="Show in Discover"   desc="Your profile appears in the Discover directory."                              on={identity.show_in_discover}   onChange={(v) => { setIdentity(p=>({...p,show_in_discover:v}));   saveIdentity() }} />
              <ToggleRow label="Allow Tracking"     desc="Other creators can track your profile activity."                             on={identity.allow_tracking}     onChange={(v) => { setIdentity(p=>({...p,allow_tracking:v}));     saveIdentity() }} />
              <ToggleRow label="Show Tracker Count" desc="Display number of trackers on your public profile."                          on={identity.show_tracker_count} onChange={(v) => { setIdentity(p=>({...p,show_tracker_count:v})); saveIdentity() }} />
              <div className="mt-6 pt-6 border-t border-white/[0.07]">
                <p className="text-white font-semibold text-[15px] mb-0.5">Verification ID</p>
                <p className="text-white/35 text-[12px] mb-4">Your permanent identity anchor on Candoxa.</p>
                <p className="text-white/55 text-[12px] font-medium mb-2">Your Candoxa ID</p>
                <div className="flex gap-3">
                  <input value={candoxaId} readOnly placeholder="Not yet assigned"
                    className="flex-1 bg-[#111118] border border-white/[0.10] rounded-xl px-4 py-3 text-white/60 text-[13px] font-mono outline-none cursor-default placeholder-white/20" />
                  <button onClick={copyId} className="px-5 py-3 rounded-xl text-white text-[13px] font-semibold flex-shrink-0 hover:opacity-90 transition-opacity" style={{ background: '#0038FF' }}>
                    {copied ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>
                <p className="text-white/30 text-[11px] mt-2.5 font-medium">This ID is permanently linked to your identity. It cannot be changed.</p>
              </div>
            </div>
          )}

          {/* PLAN & BILLING */}
          {tab === 'billing' && (
            <div>
              <div className="pb-4 border-b border-white/[0.07] mb-5 flex items-start justify-between">
                <p className="text-white font-semibold text-[15px]">Current Plan</p>
                <button className="px-5 py-2 rounded-xl text-white text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ background: '#0038FF' }}>Save Changes</button>
              </div>
              <div className="border border-white/[0.08] rounded-xl px-4 py-3 mb-6">
                <p className="text-white font-semibold text-[14px]">{profile?.plan === 'pro' ? 'Pro Plan' : 'Free'}</p>
                <p className="text-white/35 text-[12px] mt-0.5">10 daily secures · Public profile · Basic identity features</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl overflow-hidden mb-4">
                <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-[14px]">Pro Plan</p>
                    <p className="text-white/35 text-[12px]">Everything in Free, plus advanced features.</p>
                  </div>
                  <span className="text-white/50 text-[13px] font-semibold">$9/mo</span>
                </div>
                {[
                  { label: 'Unlimited daily secures', desc: 'Remove the 10/day limit entirely.' },
                  { label: 'Priority verification',   desc: 'Faster anchoring with priority queue access.' },
                  { label: 'Advanced analytics',      desc: 'See who viewed your records and when.' },
                ].map((f) => (
                  <div key={f.label} className="px-4 py-3.5 border-b border-white/[0.07] last:border-0 flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-[13px] font-medium">{f.label}</p>
                      <p className="text-white/35 text-[11px]">{f.desc}</p>
                    </div>
                    <span className="text-white/40 text-[12px]">$9/mo</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-3.5 rounded-xl text-white text-[14px] font-semibold hover:opacity-90 transition-opacity" style={{ background: '#0038FF' }}>
                Save Changes
              </button>
            </div>
          )}

          {/* INTEGRATIONS */}
          {tab === 'integrations' && (
            <div>
              <SectionHeader title="Connected Platforms" subtitle="Connect platforms to auto-fill content URLs when securing." />
              {Object.entries(integrations).map(([platform, handle]) => (
                <div key={platform} className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
                  <div>
                    <p className="text-white/80 text-[13px] font-medium">{platform}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{handle ? `Connected · ${handle}` : 'Not connected'}</p>
                  </div>
                  <button
                    onClick={() => setIntegrations(prev => ({ ...prev, [platform]: handle ? null : 'connected' }))}
                    className="px-4 py-2 rounded-xl border border-white/[0.12] text-white/55 text-[12px] font-semibold hover:bg-white/[0.05] hover:text-white/75 transition-colors"
                  >
                    {handle ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}