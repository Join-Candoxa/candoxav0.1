// components/settings/SettingsPage.tsx — All settings tabs
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const tabs = [
  { id: 'profile', label: 'My Profile', icon: '◯' },
  { id: 'security', label: 'Account & Security', icon: '🔒' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'identity', label: 'Identity', icon: '🛡' },
  { id: 'billing', label: 'Plan & Billing', icon: '💳' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
]

const platforms = ['X (Twitter)', 'LinkedIn', 'YouTube', 'Substack', 'Medium', 'TikTok']

export default function SettingsPage({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    new_tracker: true,
    entry_secured: true,
    milestone: true,
    referral_joined: true,
    weekly_digest: false,
    product_updates: false,
  })
  const [identityPrefs, setIdentityPrefs] = useState({
    is_public: true,
    show_in_discover: true,
    allow_tracking: true,
    show_tracker_count: true,
  })

  useEffect(() => {
    const fetch = async () => {
      const { data: p } = await supabase.from('users').select('*').eq('email', user.email).single()
      setProfile(p)
      if (p) {
        setIdentityPrefs({
          is_public: p.is_public ?? true,
          show_in_discover: p.show_in_discover ?? true,
          allow_tracking: p.allow_tracking ?? true,
          show_tracker_count: true,
        })
      }
    }
    fetch()
  }, [user])

  const saveIdentity = async () => {
    setSaving(true)
    await supabase.from('users').update(identityPrefs).eq('id', profile.id)
    setSaving(false)
  }

  const Toggle = ({ value, onChange }: { value: boolean, onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-blue-600' : 'bg-white/10'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )

  return (
    <div className="flex gap-6">
      {/* Left tabs */}
      <div className="w-56 shrink-0">
        <div className="bg-[#0A0A0F] border border-white/8 rounded-2xl p-3">
          <p className="text-white/30 text-xs px-3 py-2 uppercase tracking-wider">Creators You Track</p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 bg-[#0A0A0F] border border-white/8 rounded-2xl p-8">
        <h1 className="text-white text-xl font-bold mb-1">Settings</h1>
        <p className="text-white/40 text-sm mb-8">Manage your account, identity, and preferences.</p>

        {/* Profile tab */}
        {activeTab === 'profile' && profile && (
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Display Name</label>
              <input
                defaultValue={profile.display_name}
                className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none"
                onBlur={async (e) => {
                  await supabase.from('users').update({ display_name: e.target.value }).eq('id', profile.id)
                }}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Username</label>
              <input
                value={`@${profile.username}`}
                disabled
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white/40 outline-none cursor-not-allowed"
              />
              <p className="text-white/20 text-xs mt-1">Username cannot be changed.</p>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Bio</label>
              <textarea
                defaultValue={profile.bio}
                rows={3}
                className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none resize-none"
                onBlur={async (e) => {
                  await supabase.from('users').update({ bio: e.target.value }).eq('id', profile.id)
                }}
              />
            </div>
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === 'notifications' && (
          <div>
            <p className="text-white font-semibold mb-1">Notification Preferences</p>
            <p className="text-white/40 text-sm mb-6">Control what Candoxa sends you.</p>
            <div className="space-y-4">
              {[
                { key: 'new_tracker', label: 'New Tracker', desc: 'Someone started tracking your profile.' },
                { key: 'entry_secured', label: 'Entry Secured Confirmation', desc: 'Email confirmation each time an entry is anchored.' },
                { key: 'milestone', label: 'Milestone Unlocked', desc: 'Notify when you reach a new milestone or badge.' },
                { key: 'referral_joined', label: 'Referral Joined', desc: 'A creator you referred has joined Candoxa.' },
                { key: 'weekly_digest', label: 'Weekly Digest', desc: 'A weekly summary of your growth and activity.' },
                { key: 'product_updates', label: 'Product Updates', desc: 'New features and announcements from Candoxa.' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/40 text-xs">{item.desc}</p>
                  </div>
                  <Toggle
                    value={notifPrefs[item.key as keyof typeof notifPrefs]}
                    onChange={() => setNotifPrefs({ ...notifPrefs, [item.key]: !notifPrefs[item.key as keyof typeof notifPrefs] })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Identity tab */}
        {activeTab === 'identity' && (
          <div>
            <p className="text-white font-semibold mb-1">Identity Visibility</p>
            <p className="text-white/40 text-sm mb-6">Control how your profile appears on Candoxa.</p>
            <div className="space-y-4 mb-8">
              {[
                { key: 'is_public', label: 'Public Profile', desc: `Anyone can view your profile at candoxa.com/@${profile?.username}` },
                { key: 'show_in_discover', label: 'Show in Discover', desc: 'Your profile appears in the Discover directory.' },
                { key: 'allow_tracking', label: 'Allow Tracking', desc: 'Other creators can track your profile activity.' },
                { key: 'show_tracker_count', label: 'Show Tracker Count', desc: 'Display number of trackers on your public profile.' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/40 text-xs">{item.desc}</p>
                  </div>
                  <Toggle
                    value={identityPrefs[item.key as keyof typeof identityPrefs]}
                    onChange={() => setIdentityPrefs({ ...identityPrefs, [item.key]: !identityPrefs[item.key as keyof typeof identityPrefs] })}
                  />
                </div>
              ))}
            </div>

            {profile?.candoxa_id && (
              <div>
                <p className="text-white font-semibold mb-1">Verification ID</p>
                <p className="text-white/40 text-sm mb-4">Your permanent identity anchor on Candoxa.</p>
                <p className="text-white/60 text-sm mb-2">Your Candoxa ID</p>
                <div className="flex gap-3">
                  <input
                    value={profile.candoxa_id}
                    disabled
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white/60 font-mono text-sm outline-none"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(profile.candoxa_id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-3 rounded-xl transition-colors"
                  >
                    Copy ID
                  </button>
                </div>
                <p className="text-white/30 text-xs mt-2">This ID is permanently linked to your identity. It cannot be changed.</p>
              </div>
            )}

            <button onClick={saveIdentity} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white text-sm px-6 py-3 rounded-xl transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Billing tab */}
        {activeTab === 'billing' && (
          <div>
            <p className="text-white font-semibold mb-6">Current Plan</p>
            <div className="bg-black/30 border border-white/10 rounded-xl p-5 flex items-center justify-between mb-6">
              <div>
                <p className="text-white font-bold">Free</p>
                <p className="text-white/40 text-sm">10 daily secures · Public profile · Basic identity features</p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                Save Changes
              </button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Pro Plan', desc: 'Everything in Free, plus advanced features.' },
                { name: 'Unlimited daily secures', desc: 'Remove the 10/day limit entirely.' },
                { name: 'Priority verification', desc: 'Faster anchoring with priority queue access.' },
                { name: 'Advanced analytics', desc: 'See who viewed your records and when.' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{item.name}</p>
                    <p className="text-white/40 text-xs">{item.desc}</p>
                  </div>
                  <span className="text-white/40 text-sm">$9/mo</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors">
              Save Changes
            </button>
          </div>
        )}

        {/* Integrations tab */}
        {activeTab === 'integrations' && (
          <div>
            <p className="text-white font-semibold mb-1">Connected Platforms</p>
            <p className="text-white/40 text-sm mb-6">Connect platforms to auto-fill content URLs when securing.</p>
            <div className="space-y-3">
              {platforms.map((platform) => (
                <div key={platform} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{platform}</p>
                    <p className="text-white/30 text-xs">Not connected</p>
                  </div>
                  <button className="border border-white/20 text-white/60 text-xs px-4 py-2 rounded-xl hover:border-white/40 transition-colors">
                    Connected
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <p className="text-white font-semibold mb-1">Account & Security</p>
              <p className="text-white/40 text-sm mb-6">Manage your login and security settings.</p>
              <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                <p className="text-white text-sm font-medium mb-1">Email</p>
                <p className="text-white/50 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-5">
              <p className="text-white text-sm font-medium mb-1">Authentication</p>
              <p className="text-white/40 text-xs">Signed in via Google OAuth. Password management is handled by Google.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}