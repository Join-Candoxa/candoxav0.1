// components/profile/ProfilePage.tsx — Creator public profile
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const platformColor: Record<string, string> = {
  YouTube: 'bg-red-600',
  'X (Twitter)': 'bg-black border border-white/20',
  Instagram: 'bg-pink-600',
  LinkedIn: 'bg-blue-700',
  GitHub: 'bg-gray-700',
  TikTok: 'bg-black border border-white/20',
  Medium: 'bg-green-700',
  Substack: 'bg-orange-600',
  Other: 'bg-blue-900',
}

export default function ProfilePage({ user }: { user: any }) {
  const [profile,       setProfile]       = useState<any>(null)
  const [entries,       setEntries]       = useState<any[]>([])
  const [trackerCount,  setTrackerCount]  = useState(0)
  const [editing,       setEditing]       = useState(false)
  const [displayName,   setDisplayName]   = useState('')
  const [bio,           setBio]           = useState('')
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: p } = await supabase
        .from('users').select('*').eq('email', user.email).single()
      setProfile(p)
      setDisplayName(p?.display_name || '')
      setBio(p?.bio || '')
      setAvatarUrl(p?.avatar_url || null)

      if (p) {
        const { data: e } = await supabase
          .from('entries').select('*').eq('user_id', p.id).eq('status', 'secured')
          .order('secured_at', { ascending: false })
        setEntries(e || [])

        const { count } = await supabase
          .from('tracking').select('*', { count: 'exact', head: true }).eq('tracked_id', p.id)
        setTrackerCount(count || 0)
      }
    }
    fetchProfile()
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    let newAvatarUrl = avatarUrl

    if (avatarFile && profile?.id) {
      const ext  = avatarFile.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars').upload(path, avatarFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}` // cache bust
      }
    }

    await supabase.from('users').update({
      display_name: displayName,
      bio,
      avatar_url: newAvatarUrl,
    }).eq('id', profile.id)

    setProfile({ ...profile, display_name: displayName, bio, avatar_url: newAvatarUrl })
    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditing(false)
    setSaving(false)
  }

  const handleCancelEdit = () => {
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditing(false)
  }

  const displayAvatar = avatarPreview || avatarUrl
  const initials = (profile?.display_name || profile?.username || user?.email || 'U')[0].toUpperCase()
  const palette  = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const avatarBg = palette[initials.charCodeAt(0) % palette.length]

  const stats = [
    { label: 'Entries',    value: entries.length },
    { label: 'Tracked by', value: trackerCount },
    { label: 'Strength',   value: profile?.profile_strength || 0 },
    { label: 'Plan',       value: profile?.plan?.toUpperCase() || 'FREE' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-8 mb-6">

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-5">

            {/* Avatar — clickable when editing */}
            <div className="relative flex-shrink-0">
              <div
                onClick={() => editing && fileRef.current?.click()}
                className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center ${editing ? 'cursor-pointer ring-2 ring-blue-500/60 ring-offset-2 ring-offset-[#0A0A0F]' : ''}`}
              >
                {displayAvatar
                  ? <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                  : <div className={`w-full h-full flex items-center justify-center ${avatarBg}`}>
                      <span className="text-white text-2xl font-bold">{initials}</span>
                    </div>
                }
              </div>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-600 border-2 border-[#0A0A0F] flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div>
              {editing ? (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-white text-lg font-bold outline-none mb-1 w-full focus:border-blue-500 transition-colors"
                />
              ) : (
                <h1 className="text-white text-xl font-bold">
                  {profile?.display_name || profile?.username}
                </h1>
              )}
              <p className="text-white/40 text-sm">@{profile?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editing && (
              <button onClick={handleCancelEdit}
                className="border border-white/10 text-white/50 text-sm px-4 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                Cancel
              </button>
            )}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm px-4 py-2 rounded-xl"
            >
              {saving ? 'Saving...' : editing ? 'Save Profile' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {editing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            placeholder="Write a short bio..."
            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none resize-none mb-4 focus:border-blue-500 transition-colors"
          />
        ) : (
          <p className="text-white/50 text-sm mb-6">{profile?.bio || 'No bio yet.'}</p>
        )}

        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-white text-xl font-bold">{stat.value}</p>
              <p className="text-white/40 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {profile?.candoxa_id && (
          <div className="mt-4 bg-black/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-white/40 text-xs">Candoxa ID</span>
            <span className="text-white/60 text-xs font-mono">{profile.candoxa_id}</span>
          </div>
        )}
      </div>

      <h2 className="text-white font-bold text-lg mb-4">Secured Entries</h2>

      {entries.length === 0 ? (
        <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-10 text-center">
          <p className="text-white/30 text-sm">No secured entries yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${platformColor[entry.platform] || 'bg-blue-900'}`}>
                  {entry.platform?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-1">{entry.title}</p>
                  {entry.description && (
                    <p className="text-white/40 text-xs mb-2 line-clamp-2">{entry.description}</p>
                  )}
                  {entry.screenshot_url && (
                    <img src={entry.screenshot_url} alt="screenshot" className="w-full rounded-xl mb-3 max-h-40 object-cover" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">Secured</span>
                      <span className="text-white/30 text-xs">
                        {new Date(entry.secured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <a href={entry.url} target="_blank" rel="noopener noreferrer"
                      className="text-white/30 text-xs hover:text-white transition-colors">
                      identify
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}