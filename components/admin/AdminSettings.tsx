// components/admin/AdminSettings.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? '#0038FF' : 'rgba(255,255,255,0.12)' }}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[26px]' : 'left-0.5'}`} />
    </button>
  )
}

function formatUptime(s: number) {
  return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`
}

const SUB_TABS = ['General', 'Security', 'Points Rule', 'Notifications', 'Admin Users', 'Payment settings', 'Danger Zone'] as const
type SubTab = typeof SUB_TABS[number]

export default function AdminSettings() {
  const [subTab,         setSubTab]         = useState<SubTab>('General')
  const [saved,          setSaved]          = useState(false)
  const [uptime,         setUptime]         = useState('—')
  const [platformStartMs,setPlatformStartMs]= useState<number|null>(null)

  // Settings state
  const [platformName,        setPlatformName]        = useState('Candoxa')
  const [platformStatus,      setPlatformStatus]      = useState('live')
  const [dailySecureLimit,    setDailySecureLimit]    = useState(10)
  const [allowDiscovery,      setAllowDiscovery]      = useState(true)
  const [requireScreenshot,   setRequireScreenshot]   = useState(false)
  const [showChainRef,        setShowChainRef]        = useState(true)
  const [allowUsernameChanges,setAllowUsernameChanges]= useState(false)
  const [loading,             setLoading]             = useState(false)

  useEffect(() => {
    if (!platformStartMs) return
    const tick = () => setUptime(formatUptime(Math.floor((Date.now()-platformStartMs)/1000)))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [platformStartMs])

  useEffect(() => {
    const load = async () => {
      const { data: fu } = await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
      if (fu?.created_at) setPlatformStartMs(new Date(fu.created_at).getTime())

      const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single()
      if (data) {
        setPlatformName(data.platform_name || 'Candoxa')
        setPlatformStatus(data.status || 'live')
        setDailySecureLimit(data.daily_secure_limit || 10)
        setAllowDiscovery(data.allow_discovery ?? true)
        setRequireScreenshot(data.require_screenshot ?? false)
        setShowChainRef(data.show_chain_ref ?? true)
        setAllowUsernameChanges(data.allow_username_changes ?? false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const adminEmail = session?.user?.email || 'admin'

    await supabase.from('platform_settings').upsert({
      id: 1, platform_name: platformName, status: platformStatus,
      daily_secure_limit: dailySecureLimit, allow_discovery: allowDiscovery,
      require_screenshot: requireScreenshot, show_chain_ref: showChainRef,
      allow_username_changes: allowUsernameChanges, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    await supabase.from('admin_logs').insert({
      admin_email: adminEmail, action: 'Settings changed',
      target_type: 'platform', target_label: 'Platform Settings',
      description: `Updated general settings`,
    })

    setLoading(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputCls = 'bg-[#0d1020] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/80 text-[14px] outline-none focus:border-blue-500/60 transition-colors'

  const SettingRow = ({ label, desc, tag, children }: {
    label: string; desc: string; tag?: { text: string; color: string }; children: React.ReactNode
  }) => (
    <div className="flex items-start justify-between py-5 border-b border-white/[0.06] last:border-0 gap-8">
      <div className="flex-1">
        <p className="text-white font-medium text-[14px] mb-1">{label}</p>
        <p className="text-white/40 text-[12px] leading-relaxed">{desc}</p>
        {tag && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full" style={{ background: tag.color }} />
            <span className="text-[11px] font-semibold" style={{ color: tag.color }}>{tag.text}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center">{children}</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">Settings</h1>
          <p className="text-white/35 text-sm mt-1 max-w-2xl">
            Configure platform behaviour, security rules, point thresholds, notification preferences, and admin access. All changes are logged in the audit trail.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Total Uptime: <span className="text-white/55 font-mono">{uptime}</span></p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5">

        {/* Sub-nav */}
        <div className="md:w-[200px] flex-shrink-0">
          <div className="md:sticky md:top-20 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {SUB_TABS.map((t) => (
              <button key={t} onClick={() => setSubTab(t)}
                className={`flex-shrink-0 md:w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left
                  ${subTab === t ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300' : 'text-white/40 hover:text-white/65 hover:bg-white/[0.04]'}`}>
                {t === 'General' && '⚙'}
                {t === 'Security' && '🛡'}
                {t === 'Points Rule' && '👤'}
                {t === 'Notifications' && '🔔'}
                {t === 'Admin Users' && '👥'}
                {t === 'Payment settings' && '💳'}
                {t === 'Danger Zone' && '⚠'}
                {' '}{t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-[#0d1020] border border-white/[0.08] rounded-2xl p-5 md:p-6">

          {subTab === 'General' && (
            <div>
              <SettingRow label="Platform Name" desc="The public name displayed across all user-facing views and emails.">
                <input value={platformName} onChange={(e) => setPlatformName(e.target.value)}
                  className={`${inputCls} w-40`} />
              </SettingRow>

              <SettingRow label="Platform Status" desc="Set the platform to live, maintenance mode, or invite-only. Affects all public-facing pages.">
                <div className="relative">
                  <select value={platformStatus} onChange={(e) => setPlatformStatus(e.target.value)}
                    className={`${inputCls} pr-8 appearance-none`} style={{ WebkitAppearance:'none' }}>
                    <option value="live"         style={{ background:'#0d1020' }}>Live</option>
                    <option value="maintenance"  style={{ background:'#0d1020' }}>Maintenance</option>
                    <option value="invite-only"  style={{ background:'#0d1020' }}>Invite-only</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </SettingRow>

              <SettingRow label="Daily Secure Limit per User" desc="Maximum number of entries a user can secure per day. Default is 10.">
                <div className="flex items-center gap-2">
                  <button onClick={() => setDailySecureLimit(v => Math.max(1, v-1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.07] text-white/60 hover:text-white flex items-center justify-center font-bold text-lg">−</button>
                  <span className="text-white font-bold text-[15px] w-8 text-center">{dailySecureLimit}</span>
                  <button onClick={() => setDailySecureLimit(v => v+1)}
                    className="w-8 h-8 rounded-lg bg-white/[0.07] text-white/60 hover:text-white flex items-center justify-center font-bold text-lg">+</button>
                </div>
              </SettingRow>

              <SettingRow label="Allow Public Profile Discovery" desc="When enabled, profiles appear in the Discover feed and public search results.">
                <Toggle on={allowDiscovery} onChange={setAllowDiscovery} />
              </SettingRow>

              <SettingRow
                label="Require Screenshot on Entry"
                desc="Forces users to upload a screenshot when securing an entry. Cannot be bypassed."
                tag={{ text: 'Recommended', color: '#22c55e' }}
              >
                <Toggle on={requireScreenshot} onChange={setRequireScreenshot} />
              </SettingRow>

              <SettingRow label="Show Chain Reference on Receipts" desc="Displays the on-chain reference hash on human-readable receipts for verification.">
                <Toggle on={showChainRef} onChange={setShowChainRef} />
              </SettingRow>

              <SettingRow
                label="Allow Username Changes"
                desc="Usernames are permanent on Candoxa by design. Only enable this in exceptional admin-approved cases"
                tag={{ text: 'Critical', color: '#ef4444' }}
              >
                <Toggle on={allowUsernameChanges} onChange={setAllowUsernameChanges} />
              </SettingRow>
            </div>
          )}

          {subTab === 'Security' && (
            <div>
              <p className="text-white font-semibold text-[15px] mb-5">Security Settings</p>
              <p className="text-white/35 text-[13px]">Security configuration coming soon. Current settings include 2FA enforcement on admin login and session management.</p>
            </div>
          )}

          {subTab === 'Points Rule' && (
            <div>
              <p className="text-white font-semibold text-[15px] mb-5">Points Rules</p>
              <p className="text-white/35 text-[13px]">Configure how many points are awarded per action. Connect to the Points Control page to manually award.</p>
            </div>
          )}

          {subTab === 'Notifications' && (
            <div>
              <p className="text-white font-semibold text-[15px] mb-5">Platform Notification Rules</p>
              <p className="text-white/35 text-[13px]">Configure what system notifications are sent to users and admins.</p>
            </div>
          )}

          {subTab === 'Admin Users' && <AdminUsersTab />}

          {subTab === 'Payment settings' && (
            <div>
              <p className="text-white font-semibold text-[15px] mb-5">Payment Settings</p>
              <p className="text-white/35 text-[13px]">Configure Stripe or payment provider settings here.</p>
            </div>
          )}

          {subTab === 'Danger Zone' && (
            <div className="flex flex-col gap-4">
              <div className="border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 font-semibold text-[14px] mb-1">Reset All Daily Secure Counts</p>
                <p className="text-white/35 text-[12px] mb-3">Resets the daily_secures_used counter for all users back to 0. Useful if the cron fails.</p>
                <button
                  onClick={async () => {
                    await supabase.from('users').update({ daily_secures_used: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
                  }}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 transition-colors">
                  Reset All Counts
                </button>
              </div>
              <div className="border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 font-semibold text-[14px] mb-1">Clear All Announcements</p>
                <p className="text-white/35 text-[12px] mb-3">Permanently deletes all platform announcements. This cannot be undone.</p>
                <button
                  onClick={async () => {
                    await supabase.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                  }}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 transition-colors">
                  Clear Announcements
                </button>
              </div>
            </div>
          )}

          {/* Save / Discard — General only */}
          {subTab === 'General' && (
            <div className="flex justify-end gap-3 pt-5 mt-2 border-t border-white/[0.07]">
              <button onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl border border-white/[0.15] text-white/55 text-[13px] font-semibold hover:bg-white/[0.04] transition-colors">
                Discard
              </button>
              <button onClick={handleSave} disabled={loading}
                className="px-6 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#0038FF' }}>
                {saved ? '✓ Saved!' : loading ? 'Saving…' : <>Save all changes <span>✓</span></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Admin Users sub-tab
function AdminUsersTab() {
  const [admins,   setAdmins]   = useState<any[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newRole,  setNewRole]  = useState('admin')
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    supabase.from('admin_users').select('*').order('created_at',{ascending:false}).then(({ data }) => setAdmins(data||[]))
  }, [])

  const addAdmin = async () => {
    if (!newEmail.trim()) return
    const { error } = await supabase.from('admin_users').insert({ email: newEmail.trim(), role: newRole, password_hash: 'managed_by_supabase_auth' })
    if (error) return setMsg('Failed: ' + error.message)
    setMsg('✓ Admin added. Make sure to create their Supabase Auth account too.')
    setNewEmail('')
    supabase.from('admin_users').select('*').order('created_at',{ascending:false}).then(({ data }) => setAdmins(data||[]))
  }

  const removeAdmin = async (id: string) => {
    await supabase.from('admin_users').delete().eq('id', id)
    setAdmins(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div>
      <p className="text-white font-semibold text-[15px] mb-5">Admin Users</p>

      <div className="flex gap-3 mb-4">
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@candoxa.com"
          className="flex-1 bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/80 text-[13px] outline-none focus:border-blue-500/50" />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
          className="bg-[#0a0a12] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white/70 text-[13px] outline-none">
          <option value="admin" style={{ background:'#0a0a12' }}>Admin</option>
          <option value="super_admin" style={{ background:'#0a0a12' }}>Super Admin</option>
        </select>
        <button onClick={addAdmin} className="px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold" style={{ background:'#0038FF' }}>
          Add
        </button>
      </div>

      {msg && <p className={`text-[12px] mb-3 ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

      <div className="flex flex-col gap-2">
        {admins.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-[#0a0a12] border border-white/[0.07] rounded-xl px-4 py-3">
            <div>
              <p className="text-white/80 text-[13px] font-medium">{a.email}</p>
              <p className="text-[#6B8AFF] text-[11px] capitalize">{a.role}</p>
            </div>
            <button onClick={() => removeAdmin(a.id)}
              className="text-red-400/60 hover:text-red-400 text-[12px] transition-colors">Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}