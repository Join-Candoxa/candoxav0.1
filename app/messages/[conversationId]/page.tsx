// app/messages/[conversationId]/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

function timeLabel(d: string) {
  const date = new Date(d)
  const diff  = Date.now() - date.getTime()
  if (diff < 86400000) return date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' +
    date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const i = (name || '?')[0].toUpperCase()
  const palette = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color = palette[i.charCodeAt(0) % palette.length]
  if (src) return <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      <span className="text-white text-[12px] font-bold">{i}</span>
    </div>
  )
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()

  const [user,         setUser]         = useState<any>({})
  const [profile,      setProfile]      = useState<any>(null)
  const [other,        setOther]        = useState<any>(null)
  const [messages,     setMessages]     = useState<any[]>([])
  const [input,        setInput]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [contextEntry, setContextEntry] = useState<any>(null)
  const [loaded,       setLoaded]       = useState(false)
  const [error,        setError]        = useState('')

  const bottomRef  = useRef<HTMLDivElement>(null)
  const profileRef = useRef<any>(null)

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        if (!session?.user) {
          if (!cancelled) { setError('Session expired. Please refresh.'); setLoaded(true) }
          return
        }

        setUser(session.user)

        // Try email first, then id
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
        if (cancelled) return

        if (!prof) {
          if (!cancelled) { setError('Profile not found.'); setLoaded(true) }
          return
        }

        setProfile(prof)
        profileRef.current = prof

        // Load conversation — no joins
        const { data: convo } = await supabase
          .from('conversations')
          .select('id, participant_1, participant_2, context_entry_id')
          .eq('id', conversationId)
          .maybeSingle()

        if (cancelled) return

        if (!convo) {
          if (!cancelled) { setError('Conversation not found.'); setLoaded(true) }
          return
        }

        // Load other user — separate query
        const otherId = convo.participant_1 === prof.id ? convo.participant_2 : convo.participant_1
        const { data: otherUser } = await supabase
          .from('users').select('id, username, avatar_url')
          .eq('id', otherId).maybeSingle()
        if (!cancelled && otherUser) setOther(otherUser)

        // Context entry
        if (convo.context_entry_id) {
          const { data: entry } = await supabase
            .from('entries').select('title, platform, url')
            .eq('id', convo.context_entry_id).maybeSingle()
          if (!cancelled && entry) setContextEntry(entry)
        }

        // Messages
        const { data: msgs } = await supabase
          .from('messages').select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
        if (!cancelled) setMessages(msgs || [])

        // Mark as read (fire and forget)
        supabase.from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', prof.id)
          .eq('read', false)
          .then(() => {})

        if (!cancelled) setLoaded(true)

      } catch (err: any) {
        console.error('Conversation load error:', err)
        if (!cancelled) { setError('Failed to load. Please go back and try again.'); setLoaded(true) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    if (!loaded || error || !conversationId) return

    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => {
          // If this is our own message replacing a temp one
          if (payload.new.sender_id === profileRef.current?.id) {
            const tempIdx = prev.findIndex(m =>
              m.id.startsWith('temp-') && m.content === payload.new.content
            )
            if (tempIdx !== -1) {
              const updated = [...prev]
              updated[tempIdx] = payload.new
              return updated
            }
          }
          // Otherwise dedup and append
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        // Mark other person's messages as read
        const prof = profileRef.current
        if (prof && payload.new.sender_id !== prof.id) {
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id).then(() => {})
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loaded, error, conversationId])

  const sendMessage = async () => {
    if (!input.trim() || !profile || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    // Optimistic update — show message immediately before DB confirms
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id:              tempId,
      conversation_id: conversationId,
      sender_id:       profile.id,
      content,
      read:            false,
      created_at:      new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data: inserted } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: profile.id, content, read: false })
      .select()
      .maybeSingle()

    // Replace temp with real message if real-time didn't already do it
    if (inserted) {
      setMessages(prev => {
        if (prev.find(m => m.id === inserted.id)) {
          // Real-time already replaced temp, remove any leftover temp
          return prev.filter(m => m.id !== tempId)
        }
        return prev.map(m => m.id === tempId ? inserted : m)
      })
    }

    setSending(false)
  }

  // Loading
  if (!loaded) return (
    <DashboardLayout user={user}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/30 text-[13px]">Loading conversation…</p>
        </div>
      </div>
    </DashboardLayout>
  )

  // Error — no redirect
  if (error) return (
    <DashboardLayout user={user}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" className="w-7 h-7">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <p className="text-white/50 text-[14px] font-medium mb-2">{error}</p>
        <button onClick={() => router.push('/messages')}
          className="mt-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold"
          style={{ background:'#0038FF' }}>
          Back to Messages
        </button>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col max-w-2xl mx-auto" style={{ height:'calc(100vh - 130px)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08] mb-4 flex-shrink-0">
          <button onClick={() => router.push('/messages')}
            className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 hover:bg-white/[0.10] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          {other ? (
            <>
              <Avatar src={other.avatar_url} name={other.username || '?'} />
              <div className="flex-1 min-w-0">
                <button onClick={() => router.push(`/${other.username}`)}
                  className="text-white font-semibold text-[15px] hover:text-blue-300 transition-colors text-left">
                  @{other.username}
                </button>
                {contextEntry && (
                  <p className="text-white/35 text-[11px] truncate">Re: {contextEntry.title}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 h-5 bg-white/[0.05] rounded-lg" />
          )}

          {contextEntry?.url && (
            <button onClick={() => window.open(contextEntry.url, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.10] text-white/45 text-[12px] hover:text-white/70 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              View Entry
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2">
          {messages.length === 0 && other && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
              <Avatar src={other.avatar_url} name={other.username || '?'} />
              <p className="text-white/55 text-[14px] font-medium mt-3">@{other.username}</p>
              <p className="text-white/25 text-[12px] mt-1">Say hello to start the conversation.</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMe     = msg.sender_id === profile?.id
            const isTemp   = msg.id.startsWith('temp-')
            const showTime = idx === 0 ||
              (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime()) > 300000

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-white/20 text-[11px] text-center my-2">{timeLabel(msg.created_at)}</p>
                )}
                <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && other && <Avatar src={other.avatar_url} name={other.username || '?'} />}
                  <div className="max-w-[72%]">
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                        isMe ? 'text-white rounded-br-sm' : 'bg-white/[0.07] text-white/85 rounded-bl-sm'
                      } ${isTemp ? 'opacity-70' : ''}`}
                      style={isMe ? { background:'#0038FF' } : undefined}>
                      {msg.content}
                    </div>
                    {isTemp && (
                      <p className="text-white/25 text-[10px] text-right mt-0.5 pr-1">Sending…</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 pt-3 border-t border-white/[0.08]">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-[#0A0A0F] border border-white/[0.10] rounded-2xl px-4 py-3 focus-within:border-white/20 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                }}
                placeholder="Write a message..."
                rows={1}
                className="w-full bg-transparent text-white/80 text-[14px] outline-none resize-none placeholder-white/25 leading-relaxed"
                style={{ maxHeight:'120px' }}
              />
            </div>
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-all"
              style={{ background:'#0038FF' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="text-white/20 text-[11px] mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </DashboardLayout>
  )
}