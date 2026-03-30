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
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' + date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const i = (name || '?')[0].toUpperCase()
  const palette = ['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700','bg-cyan-700']
  const color = palette[i.charCodeAt(0) % palette.length]
  if (src) return <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  return <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}><span className="text-white text-[12px] font-bold">{i}</span></div>
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()

  const [user,        setUser]        = useState<any>(null)
  const [profile,     setProfile]     = useState<any>(null)
  const [other,       setOther]       = useState<any>(null)
  const [messages,    setMessages]    = useState<any[]>([])
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [contextEntry,setContextEntry]= useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/onboarding'); return }
      setUser(session.user)
      supabase.from('users').select('*').eq('email', session.user.email).single()
        .then(({ data }) => { setProfile(data); if (data) fetchConvo(data) })
    })
  }, [conversationId])

  const fetchConvo = async (prof: any) => {
    // Load conversation
    const { data: convo } = await supabase
      .from('conversations')
      .select(`
        id, participant_1, participant_2, context_entry_id,
        u1:users!conversations_participant_1_fkey(id, username, avatar_url),
        u2:users!conversations_participant_2_fkey(id, username, avatar_url),
        entry:entries(title, platform, url)
      `)
      .eq('id', conversationId)
      .single()

    if (!convo) { router.push('/messages'); return }

    const otherUser = convo.participant_1 === prof.id ? convo.u2 : convo.u1
    setOther(otherUser)
    setContextEntry(convo.entry)

    // Load messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    // Mark received messages as read
    await supabase.from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', prof.id)
      .eq('read', false)
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        // Mark as read immediately if it's from the other person
        if (profile && payload.new.sender_id !== profile.id) {
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, profile])

  const sendMessage = async () => {
    if (!input.trim() || !profile || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id:       profile.id,
      content,
      read:            false,
    })
    setSending(false)
  }

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col h-[calc(100vh-64px-48px)] md:h-[calc(100vh-64px)] max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08] mb-4 flex-shrink-0">
          <button onClick={() => router.push('/messages')}
            className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 hover:bg-white/[0.10] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <Avatar src={other?.avatar_url} name={other?.username || '?'} />
          <div className="flex-1 min-w-0">
            <button onClick={() => other?.username && router.push(`/${other.username}`)}
              className="text-white font-semibold text-[15px] hover:text-blue-300 transition-colors text-left">
              @{other?.username}
            </button>
            {contextEntry && (
              <p className="text-white/35 text-[11px] truncate">Re: {contextEntry.title}</p>
            )}
          </div>
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
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
              <Avatar src={other?.avatar_url} name={other?.username || '?'} />
              <p className="text-white/55 text-[14px] font-medium mt-3">@{other?.username}</p>
              <p className="text-white/25 text-[12px] mt-1">Send a message to start the conversation.</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === profile?.id
            const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000
            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-white/20 text-[11px] text-center my-2">{timeLabel(msg.created_at)}</p>
                )}
                <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && <Avatar src={other?.avatar_url} name={other?.username || '?'} />}
                  <div className="max-w-[72%]">
                    <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                      isMe
                        ? 'text-white rounded-br-sm'
                        : 'bg-white/[0.07] text-white/85 rounded-bl-sm'
                    }`}
                    style={isMe ? { background:'#0038FF' } : undefined}>
                      {msg.content}
                    </div>
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
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background:'#0038FF' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="text-white/20 text-[11px] mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </DashboardLayout>
  )
}