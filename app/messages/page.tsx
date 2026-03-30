// app/messages/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function Avatar({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'sm'|'md' }) {
  const i = (name || '?')[0].toUpperCase()
  const palette = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color = palette[i.charCodeAt(0) % palette.length]
  const sz = size === 'sm' ? 'w-9 h-9 text-[12px]' : 'w-11 h-11 text-[14px]'
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${color}`}><span className="text-white font-bold">{i}</span></div>
}

export default function MessagesPage() {
  const router = useRouter()
  const [user,           setUser]           = useState<any>(null)
  const [profile,        setProfile]        = useState<any>(null)
  const [conversations,  setConversations]  = useState<any[]>([])
  const [requests,       setRequests]       = useState<any[]>([])
  const [tab,            setTab]            = useState<'chats'|'requests'>('chats')
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      supabase.from('users').select('*').eq('email', session.user.email).single()
        .then(({ data }) => { setProfile(data); if (data) fetchAll(data) })
    })
  }, [])

  const fetchAll = async (prof: any) => {
    // Conversations
    const { data: convos } = await supabase
      .from('conversations')
      .select(`
        id, created_at,
        participant_1, participant_2,
        u1:users!conversations_participant_1_fkey(id, username, avatar_url),
        u2:users!conversations_participant_2_fkey(id, username, avatar_url)
      `)
      .or(`participant_1.eq.${prof.id},participant_2.eq.${prof.id}`)
      .order('created_at', { ascending: false })

    // Enrich with last message
    const enriched = await Promise.all((convos || []).map(async (c: any) => {
      const other = c.participant_1 === prof.id ? c.u2 : c.u1
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_id, read')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1).single()
      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count:'exact', head:true })
        .eq('conversation_id', c.id)
        .eq('read', false)
        .neq('sender_id', prof.id)
      return { ...c, other, lastMsg, unread: unread || 0 }
    }))
    setConversations(enriched)

    // Pending contact requests
    const { data: reqs } = await supabase
      .from('contact_requests')
      .select(`
        id, message, created_at, status,
        context_entry_id,
        sender:users!contact_requests_sender_id_fkey(id, username, avatar_url),
        entry:entries(title, platform)
      `)
      .eq('receiver_id', prof.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(reqs || [])

    setLoading(false)
  }

  const acceptRequest = async (req: any) => {
    if (!profile) return
    // Create conversation
    const p1 = req.sender.id < profile.id ? req.sender.id : profile.id
    const p2 = req.sender.id < profile.id ? profile.id : req.sender.id
    const { data: convo } = await supabase.from('conversations').upsert(
      { participant_1: p1, participant_2: p2, context_entry_id: req.context_entry_id },
      { onConflict: 'participant_1,participant_2' }
    ).select().single()

    await supabase.from('contact_requests').update({ status:'accepted' }).eq('id', req.id)

    if (convo) router.push(`/messages/${convo.id}`)
    else fetchAll(profile)
  }

  const declineRequest = async (req: any) => {
    await supabase.from('contact_requests').update({ status:'declined' }).eq('id', req.id)
    setRequests(prev => prev.filter(r => r.id !== req.id))
  }

  const pendingCount = requests.length

  if (!user || loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-[22px] font-bold tracking-tight">Messages</h1>
            <p className="text-white/40 text-[13px] mt-0.5">Your conversations and contact requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mb-5">
          <div className="flex gap-6">
            {[
              { key:'chats',    label:'Chats' },
              { key:'requests', label: pendingCount > 0 ? `Requests (${pendingCount})` : 'Requests' },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className="pb-3 text-[14px] font-medium transition-colors relative"
                style={{ color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                {t.label}
                {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background:'#0038FF' }} />}
              </button>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background:'rgba(255,255,255,0.08)' }} />
        </div>

        {/* ── CHATS ── */}
        {tab === 'chats' && (
          <div className="flex flex-col gap-2">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <p className="text-white/40 text-[14px] font-medium mb-1">No conversations yet</p>
                <p className="text-white/25 text-[13px]">Visit someone's profile and send a contact request to start chatting.</p>
              </div>
            ) : (
              conversations.map((c) => (
                <button key={c.id} onClick={() => router.push(`/messages/${c.id}`)}
                  className="w-full flex items-center gap-3 bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.15] transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <Avatar src={c.other?.avatar_url} name={c.other?.username || '?'} />
                    {c.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-white font-semibold text-[14px]">@{c.other?.username}</p>
                      {c.lastMsg && <span className="text-white/30 text-[11px] flex-shrink-0">{timeAgo(c.lastMsg.created_at)}</span>}
                    </div>
                    {c.lastMsg ? (
                      <p className={`text-[12px] truncate ${c.unread > 0 ? 'text-white/70 font-medium' : 'text-white/35'}`}>
                        {c.lastMsg.sender_id === profile?.id ? 'You: ' : ''}{c.lastMsg.content}
                      </p>
                    ) : (
                      <p className="text-white/25 text-[12px]">No messages yet — say hello!</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── REQUESTS ── */}
        {tab === 'requests' && (
          <div className="flex flex-col gap-3">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="text-white/40 text-[14px] font-medium mb-1">No pending requests</p>
                <p className="text-white/25 text-[13px]">Contact requests from other creators will appear here.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
                  {/* Sender */}
                  <div className="flex items-center gap-3">
                    <Avatar src={req.sender?.avatar_url} name={req.sender?.username || '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-[14px]">@{req.sender?.username}</p>
                      <p className="text-white/35 text-[11px]">{timeAgo(req.created_at)} ago</p>
                    </div>
                  </div>

                  {/* Context entry */}
                  {req.entry && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#6B8AFF" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 flex-shrink-0">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                      <p className="text-[#6B8AFF] text-[12px] truncate">{req.entry.title}</p>
                    </div>
                  )}

                  {/* Message */}
                  {req.message && (
                    <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                      <p className="text-white/70 text-[13px] leading-relaxed">"{req.message}"</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => declineRequest(req)}
                      className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-semibold hover:bg-white/[0.04] transition-colors">
                      Decline
                    </button>
                    <button onClick={() => acceptRequest(req)}
                      className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold transition-colors"
                      style={{ background:'#0038FF' }}>
                      Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}