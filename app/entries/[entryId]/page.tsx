// app/entries/[entryId]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import Image from 'next/image'

function platformIcon(platform: string) {
  const p = (platform || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
  const map: Record<string, string> = {
    youtube: '/icons/youtube.png', instagram: '/icons/instagram.png',
    twitter: '/icons/x.png', x: '/icons/x.png', linkedin: '/icons/linkedin.png',
  }
  return map[p] ?? '/icons/others.png'
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function EntryDetailPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const router = useRouter()

  const [user,    setUser]    = useState<any>({})
  const [entry,   setEntry]   = useState<any>(null)
  const [author,  setAuthor]  = useState<any>(null)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!entryId) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setUser(session.user)

      const { data: e } = await supabase
        .from('entries').select('*')
        .eq('id', entryId).maybeSingle()

      if (!e) { setError('Entry not found.'); setLoaded(true); return }
      setEntry(e)

      const { data: a } = await supabase
        .from('users').select('id, username, display_name, avatar_url, profile_strength')
        .eq('id', e.user_id).maybeSingle()
      setAuthor(a)
      setLoaded(true)
    }
    load()
  }, [entryId])

  if (!loaded) return (
    <DashboardLayout user={user}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    </DashboardLayout>
  )

  if (error || !entry) return (
    <DashboardLayout user={user}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-white/50 text-[14px] mb-4">{error || 'Entry not found.'}</p>
        <button onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold"
          style={{ background:'#0038FF' }}>
          Go Back
        </button>
      </div>
    </DashboardLayout>
  )

  const initials = (author?.username || '?')[0].toUpperCase()
  const palette  = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700']
  const color    = palette[initials.charCodeAt(0) % palette.length]

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto">

        {/* Back button */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-white/45 text-[13px] hover:text-white/70 transition-colors mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>

        <div className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl overflow-hidden">

          {/* Author row */}
          <div className="flex items-center gap-3 p-5 border-b border-white/[0.06]">
            <button onClick={() => author?.username && router.push(`/${author.username}`)}>
              {author?.avatar_url
                ? <img src={author.avatar_url} alt={author.username}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0 hover:opacity-80 transition-opacity" />
                : <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${color} hover:opacity-80 transition-opacity`}>
                    <span className="text-white text-[15px] font-bold">{initials}</span>
                  </div>
              }
            </button>
            <div className="flex-1 min-w-0">
              <button onClick={() => author?.username && router.push(`/${author.username}`)}
                className="text-white font-semibold text-[14px] hover:text-blue-300 transition-colors text-left">
                {author?.display_name || author?.username || 'Unknown'}
              </button>
              <p className="text-white/40 text-[12px]">@{author?.username} · {timeAgo(entry.secured_at)}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
              style={{ background:'rgba(0,56,255,0.10)', borderColor:'rgba(0,56,255,0.25)' }}>
              <Image src={platformIcon(entry.platform)} alt={entry.platform} width={14} height={14} />
              <span className="text-[#6B8AFF] text-[11px] font-semibold">{entry.platform}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h1 className="text-white text-[18px] font-bold leading-snug mb-3">{entry.title}</h1>

            {entry.description && (
              <p className="text-white/60 text-[14px] leading-relaxed mb-5">{entry.description}</p>
            )}

            {/* Screenshot */}
            {entry.screenshot_url && (
              <div className="mb-5 rounded-xl overflow-hidden border border-white/[0.06]">
                <img src={entry.screenshot_url} alt="screenshot"
                  className="w-full object-cover" style={{ maxHeight:'400px' }} />
              </div>
            )}

            {/* Blockchain badge */}
            {entry.blockchain_ref ? (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 mb-5">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-green-400 text-[12px] font-semibold">Anchored on Base blockchain</span>
                <a href={`https://basescan.org/tx/${entry.blockchain_ref}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-green-400/70 text-[11px] hover:text-green-300 transition-colors flex items-center gap-1">
                  View on Basescan
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5 mb-5">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-blue-300 text-[12px] font-semibold">Secured · Indelible</span>
                <span className="ml-auto text-white/30 text-[11px]">
                  {new Date(entry.secured_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                </span>
              </div>
            )}

            {/* Open link button */}
            {entry.url && (
              <button
                onClick={() => window.open(entry.url, '_blank', 'noopener,noreferrer')}
                className="w-full py-4 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ background:'#0038FF' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open Original Link
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}