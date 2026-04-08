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
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="text-white font-bold">{i}</span>
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()

  // Start with empty object not null — prevents DashboardLayout confusion
  const [user,          setUser]          = useState<any>({})
  const [profile,       setProfile]       = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [received,      setReceived]      = useState<any[]>([])
  const [sent,          setSent]          = useState<any[]>([])
  const [tab,           setTab]           = useState<'chats'|'requests'>('chats')
  const [loading,       setLoading]       = useState(true)
  const [accepting,     setAccepting]     = useState<string|null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // NEVER redirect — just show empty state if no session
      if (!session?.user) { setLoading(false); return }

      setUser(session.user)

      const getProfile = async () => {
        let prof: any = null
        if (session.user.email) {
          const { data } = await supabase.from('users').select('*')
            .eq('email', session.user.email).maybeSingle()
          prof = data
        }
        if (!prof) {
          const { data } = await supabase.from('users').select('*')
            .eq('id', session.user.id).maybeSingle()
          prof = data
        }
        if (prof) {
          setProfile(prof)
          await fetchAll(prof)
        }
        setLoading(false)
      }
      getProfile()
    })
  }, [])

  const fetchAll = async (prof: any) => {
    await Promise.all([
      fetchConversations(prof),
      fetchRequests(prof),
    ])
  }

  const fetchConversations = async (prof: any) => {
    // Plain query — no FK alias joins
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, created_at, participant_1, participant_2, context_entry_id')
      .or(`participant_1.eq.${prof.id},participant_2.eq.${prof.id}`)
      .order('created_at', { ascending: false })

    if (!convos || convos.length === 0) { setConversations([]); return }

    const enriched = await Promise.all(convos.map(async (c: any) => {
      const otherId = c.participant_1 === prof.id ? c.participant_2 : c.participant_1

      const { data: otherUser } = await supabase
        .from('users').select('id, username, avatar_url')
        .eq('id', otherId).maybeSingle()

      const { data: lastMsg } = await supabase
        .from('messages').select('content, created_at, sender_id, read')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()

      const { count: unread } = await supabase
        .from('messages').select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('read', false)
        .neq('sender_id', prof.id)

      return { ...c, other: otherUser, lastMsg, unread: unread || 0 }
    }))

    setConversations(enriched)
  }

  const fetchRequests = async (prof: any) => {
    // Received
    const { data: recvRaw } = await supabase
      .from('contact_requests')
      .select('id, message, created_at, status, context_entry_id, sender_id')
      .eq('receiver_id', prof.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const recvEnriched = await Promise.all((recvRaw || []).map(async (r: any) => {
      const { data: sender } = await supabase.from('users')
        .select('id, username, avatar_url').eq('id', r.sender_id).maybeSingle()
      let entry = null
      if (r.context_entry_id) {
        const { data: e } = await supabase.from('entries')
          .select('title, platform').eq('id', r.context_entry_id).maybeSingle()
        entry = e
      }
      return { ...r, sender, entry }
    }))
    setReceived(recvEnriched)

    // Sent pending
    const { data: sentRaw } = await supabase
      .from('contact_requests')
      .select('id, message, created_at, status, context_entry_id, receiver_id')
      .eq('sender_id', prof.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const sentEnriched = await Promise.all((sentRaw || []).map(async (r: any) => {
      const { data: receiver } = await supabase.from('users')
        .select('id, username, avatar_url').eq('id', r.receiver_id).maybeSingle()
      let entry = null
      if (r.context_entry_id) {
        const { data: e } = await supabase.from('entries')
          .select('title, platform').eq('id', r.context_entry_id).maybeSingle()
        entry = e
      }
      return { ...r, receiver, entry }
    }))
    setSent(sentEnriched)
  }

  const acceptRequest = async (req: any) => {
    if (!profile || accepting) return
    setAccepting(req.id)

    const p1 = req.sender_id < profile.id ? req.sender_id : profile.id
    const p2 = req.sender_id < profile.id ? profile.id : req.sender_id

    const { data: convo } = await supabase
      .from('conversations')
      .upsert(
        { participant_1: p1, participant_2: p2, context_entry_id: req.context_entry_id || null },
        { onConflict: 'participant_1,participant_2' }
      )
      .select('id')
      .maybeSingle()

    await supabase.from('contact_requests').update({ status: 'accepted' }).eq('id', req.id)

    setAccepting(null)

    if (convo?.id) {
      router.push(`/messages/${convo.id}`)
    } else {
      // Find existing conversation
      const { data: existing } = await supabase
        .from('conversations').select('id')
        .eq('participant_1', p1).eq('participant_2', p2).maybeSingle()
      if (existing?.id) router.push(`/messages/${existing.id}`)
      else { setReceived(prev => prev.filter(r => r.id !== req.id)) }
    }
  }

  const declineRequest = async (req: any) => {
    await supabase.from('contact_requests').update({ status: 'declined' }).eq('id', req.id)
    setReceived(prev => prev.filter(r => r.id !== req.id))
  }

  const cancelRequest = async (req: any) => {
    await supabase.from('contact_requests').update({ status: 'cancelled' }).eq('id', req.id)
    setSent(prev => prev.filter(r => r.id !== req.id))
  }

  // Open conversation — simple push, no logic
  const openConversation = (id: string) => {
    router.push(`/messages/${id}`)
  }

  const pendingCount = received.length

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto">

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
              { key: 'chats',    label: 'Chats' },
              { key: 'requests', label: pendingCount > 0 ? `Requests (${pendingCount})` : 'Requests' },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className="pb-3 text-[14px] font-medium transition-colors relative"
                style={{ color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.40)' }}>
                {t.label}
                {tab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: '#0038FF' }} />
                )}
              </button>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}

        {!loading && tab === 'chats' && (
          <div className="flex flex-col gap-2">
            {/* Sent pending requests */}
            {sent.length > 0 && (
              <div className="mb-3">
                <p className="text-white/35 text-[11px] font-semibold uppercase tracking-[0.10em] px-1 mb-2">Pending Requests Sent</p>
                <div className="flex flex-col gap-2">
                  {sent.map((req) => (
                    <div key={req.id}
                      className="flex items-center gap-3 bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4">
                      <div className="relative flex-shrink-0">
                        <Avatar src={req.receiver?.avatar_url} name={req.receiver?.username || '?'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-[14px]">@{req.receiver?.username}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                          <span className="text-yellow-400/80 text-[11px] font-medium">Requested · {timeAgo(req.created_at)}</span>
                        </div>
                        {req.message && (
                          <p className="text-white/35 text-[12px] mt-0.5 truncate">"{req.message}"</p>
                        )}
                      </div>
                      <button onClick={() => cancelRequest(req)}
                        className="px-3 py-1.5 rounded-xl border border-white/[0.10] text-white/40 text-[11px] font-medium hover:border-red-500/30 hover:text-red-400/70 transition-colors flex-shrink-0">
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversations */}
            {conversations.length === 0 && sent.length === 0 ? (
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
              <>
                {conversations.length > 0 && (
                  <>
                    {sent.length > 0 && (
                      <p className="text-white/35 text-[11px] font-semibold uppercase tracking-[0.10em] px-1 mb-2">Conversations</p>
                    )}
                    {conversations.map((c) => (
                      /* KEY FIX: onClick uses openConversation — simple router.push */
                      <button
                        key={c.id}
                        onClick={() => openConversation(c.id)}
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
                            {c.lastMsg && (
                              <span className="text-white/30 text-[11px] flex-shrink-0">{timeAgo(c.lastMsg.created_at)}</span>
                            )}
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
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Requests tab */}
        {!loading && tab === 'requests' && (
          <div className="flex flex-col gap-3">
            {received.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" className="w-8 h-8">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="text-white/40 text-[14px] font-medium mb-1">No pending requests</p>
                <p className="text-white/25 text-[13px]">Contact requests from other creators will appear here.</p>
              </div>
            ) : (
              received.map((req) => (
                <div key={req.id} className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={req.sender?.avatar_url} name={req.sender?.username || '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-[14px]">@{req.sender?.username}</p>
                      <p className="text-white/35 text-[11px]">{timeAgo(req.created_at)} ago</p>
                    </div>
                  </div>

                  {req.entry && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#6B8AFF" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5 flex-shrink-0">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                      <p className="text-[#6B8AFF] text-[12px] truncate">{req.entry.title}</p>
                    </div>
                  )}

                  {req.message && (
                    <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                      <p className="text-white/70 text-[13px] leading-relaxed">"{req.message}"</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => declineRequest(req)}
                      className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px] font-semibold hover:bg-white/[0.04] transition-colors">
                      Decline
                    </button>
                    <button
                      onClick={() => acceptRequest(req)}
                      disabled={accepting === req.id}
                      className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: '#0038FF' }}>
                      {accepting === req.id ? (
                        <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Accepting…</>
                      ) : 'Accept'}
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