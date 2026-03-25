// components/admin/AdminUsers.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 15
export type UserFilterType = 'all' | 'flagged' | 'most' | 'least'

interface UserRow {
  id: string; username: string; email: string; avatar_url: string | null
  status: string | null; profile_strength: number; entry_count: number
  tracking_count: number; tracked_by: number; created_at: string; bio?: string
}

function Avatar({ src, name, size='md' }: { src:string|null; name:string; size?:'sm'|'md'|'lg' }) {
  const i=(name||'?')[0].toUpperCase()
  const c=['bg-blue-700','bg-purple-700','bg-green-700','bg-rose-700','bg-amber-700'][i.charCodeAt(0)%5]
  const sz={sm:'w-8 h-8 text-[12px]',md:'w-10 h-10 text-[14px]',lg:'w-14 h-14 text-[20px]'}[size]
  if(src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 ${c}`}><span className="text-white font-bold">{i}</span></div>
}

function FlagIcon({className=''}:{className?:string}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}
function TrashIcon({className=''}:{className?:string}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
}

function StatusBadge({ status }: { status: string | null }) {
  const flagged = (status||'').toLowerCase()==='flagged'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${flagged?'bg-orange-400':'bg-green-400'}`} />
      <span className={`text-[13px] font-medium ${flagged?'text-orange-400':'text-green-400'}`}>{flagged?'Flagged':'Active'}</span>
    </div>
  )
}

function Pagination({ current, total, onChange }: { current:number; total:number; onChange:(p:number)=>void }) {
  if(total<=1) return null
  const pages: (number|'...')[] = []
  if(total<=6) for(let i=1;i<=total;i++) pages.push(i)
  else { pages.push(1,2,3); if(current>4)pages.push('...'); if(current>3&&current<total-2)pages.push(current); if(current<total-3)pages.push('...'); pages.push(total-1,total) }
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {pages.map((p,i)=>p==='...'?<span key={`d${i}`} className="text-white/25 px-1">…</span>
        :<button key={p} onClick={()=>onChange(p as number)} className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${p===current?'bg-blue-600 text-white':'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}>{p}</button>)}
    </div>
  )
}

const FLAG_REASONS   = ['Spam / Bot activity','Possible duplicate Entry','Fake account','Inappropriate content','Other']
const DELETE_REASONS = ['Spam / Bot activity','Fake account','Terms violation','Other']

function Modal({ children, onClose, bc='border-white/[0.12]' }: { children:React.ReactNode; onClose:()=>void; bc?:string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`relative bg-[#0e0e14] border ${bc} rounded-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white z-10">✕</button>
        {children}
      </div>
    </div>
  )
}

async function getAdminEmail() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.email || 'admin'
}

async function fetchFlagInfo(userId: string) {
  const { data } = await supabase.from('admin_logs')
    .select('admin_email, created_at').eq('target_id', userId)
    .ilike('action', '%flag%').not('action','ilike','%clear%')
    .order('created_at',{ascending:false}).limit(1).single()
  return data
}

function timeAgoShort(d: string) {
  const m=Math.floor((Date.now()-new Date(d).getTime())/60000)
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}

function FlagModal({ user, onClose, onConfirm }: { user:UserRow; onClose:()=>void; onConfirm:(r:string)=>void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4"><FlagIcon className="w-7 h-7 text-orange-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Flag @{user.username}?</h2>
        <p className="text-white/35 text-[12px] mb-4 leading-relaxed">Flagging restricts certain platform actions. All activity is logged.</p>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-4 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <div className="text-left mb-5">
          <label className="text-white/50 text-[11px] font-medium mb-1.5 block">Reason •</label>
          <select value={reason} onChange={e=>setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/60 text-[13px] outline-none appearance-none">
            <option value="">Select Reason</option>
            {FLAG_REASONS.map(r=><option key={r} value={r} style={{background:'#0a0a12'}}>{r}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Cancel</button>
          <button onClick={()=>reason&&onConfirm(reason)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${reason?'bg-orange-500 hover:bg-orange-400 text-white':'bg-orange-500/20 text-orange-300/40 cursor-not-allowed'}`}>Confirm Flag</button>
        </div>
      </div>
    </Modal>
  )
}

function ClearFlagModal({ user, flagInfo, onClose, onConfirm }: { user:UserRow; flagInfo:any; onClose:()=>void; onConfirm:(n:string)=>void }) {
  const [note, setNote] = useState('')
  return (
    <Modal onClose={onClose} bc="border-green-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"><FlagIcon className="w-7 h-7 text-green-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Clear Flag on @{user.username}?</h2>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-3 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        {flagInfo && <p className="text-orange-400/70 text-[11px] text-left mb-4">Flagged by {flagInfo.admin_email} · {timeAgoShort(flagInfo.created_at)}</p>}
        <div className="text-left mb-5">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Clearance Note (Optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="e.g. Reviewed — no violations found"
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/60 text-[13px] outline-none resize-none placeholder-white/20" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Cancel</button>
          <button onClick={()=>onConfirm(note)} className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[13px] font-semibold">Clear Flag</button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteModal({ user, onClose, onConfirm }: { user:UserRow; onClose:()=>void; onConfirm:(r:string)=>void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal onClose={onClose} bc="border-red-500/40">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><TrashIcon className="w-7 h-7 text-red-400" /></div>
        <h2 className="text-white font-bold text-[16px] mb-4">Delete @{user.username}?</h2>
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 mb-4 text-left">
          <Avatar src={user.avatar_url} name={user.username} size="sm" />
          <div><p className="text-white text-[13px] font-medium">@{user.username}</p><p className="text-white/35 text-[11px]">{user.email}</p></div>
        </div>
        <div className="text-left mb-4">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Reason •</label>
          <select value={reason} onChange={e=>setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/60 text-[13px] outline-none appearance-none">
            <option value="">Select Reason</option>
            {DELETE_REASONS.map(r=><option key={r} value={r} style={{background:'#0a0a12'}}>{r}</option>)}
          </select>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 text-left mb-5">
          <p className="text-red-300 text-[12px] font-semibold mb-1">Permanent and irreversible</p>
          <p className="text-red-300/55 text-[11px]">The on-chain timestamp remains but the account is delisted from all views.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Cancel</button>
          <button onClick={()=>reason&&onConfirm(reason)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${reason?'bg-red-500 hover:bg-red-400 text-white':'bg-red-500/20 text-red-300/40 cursor-not-allowed'}`}>Remove Permanently</button>
        </div>
      </div>
    </Modal>
  )
}

type MS = 'none'|'flag'|'flag_done'|'clear'|'clear_done'|'delete'|'delete_done'

function UserDetailModal({ user, onClose, onRefresh }: { user:UserRow; onClose:()=>void; onRefresh:()=>void }) {
  const [ms,       setMs]       = useState<MS>('none')
  const [reason,   setReason]   = useState('')
  const [entries,  setEntries]  = useState<any[]>([])
  const [tab,      setTab]      = useState<'secured'|'about'>('secured')
  const [flagInfo, setFlagInfo] = useState<any>(null)
  const isFlagged = (user.status||'').toLowerCase()==='flagged'
  const pct = Math.min((user.profile_strength/500)*100,100)

  useEffect(()=>{
    supabase.from('entries').select('*').eq('user_id',user.id).order('secured_at',{ascending:false}).limit(9).then(({data})=>setEntries(data||[]))
    if(isFlagged) fetchFlagInfo(user.id).then(setFlagInfo)
  },[user.id])

  const doFlag = async (r:string) => {
    const ae = await getAdminEmail()
    await Promise.all([
      supabase.from('users').update({status:'flagged'}).eq('id',user.id),
      supabase.from('admin_logs').insert({admin_email:ae,action:'Flagged User',target_type:'user',target_id:user.id,target_label:`@${user.username}`,description:r}),
    ])
    setReason(r); setMs('flag_done'); onRefresh()
  }

  const doClear = async (note:string) => {
    const ae = await getAdminEmail()
    await Promise.all([
      supabase.from('users').update({status:'active'}).eq('id',user.id),
      supabase.from('admin_logs').insert({admin_email:ae,action:'Clear Flag (User)',target_type:'user',target_id:user.id,target_label:`@${user.username}`,description:note||'Flag cleared'}),
    ])
    setReason(note); setMs('clear_done'); onRefresh()
  }

  const doDelete = async (r:string) => {
    const ae = await getAdminEmail()
    await supabase.from('admin_logs').insert({admin_email:ae,action:'Deleted User',target_type:'user',target_id:user.id,target_label:`@${user.username}`,description:r})
    await supabase.from('users').delete().eq('id',user.id)
    setReason(r); setMs('delete_done'); onRefresh()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#0e0e14] border border-white/[0.10] rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
            <button onClick={()=>isFlagged?setMs('clear'):setMs('flag')}
              className={`p-2 rounded-lg transition-colors ${isFlagged?'text-orange-400 bg-orange-500/15':'text-white/40 hover:text-orange-400 hover:bg-orange-500/10'}`}>
              <FlagIcon className="w-4 h-4" />
            </button>
            <button onClick={()=>setMs('delete')} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <TrashIcon className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white">✕</button>
          </div>

          {isFlagged && flagInfo && (
            <div className="mx-5 mt-4 bg-yellow-500/10 border-l-4 border-yellow-400 rounded-r-xl px-4 py-3">
              <p className="text-yellow-300 text-[12px] font-semibold mb-0.5">Flagged & Under Review</p>
              <p className="text-yellow-300/35 text-[10px]">By {flagInfo.admin_email} · {timeAgoShort(flagInfo.created_at)}</p>
            </div>
          )}

          <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-start gap-4 mb-5">
              <Avatar src={user.avatar_url} name={user.username} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[15px]">@{user.username}</p>
                <p className="text-white/35 text-[12px] mt-0.5 leading-relaxed line-clamp-2">{user.bio||'No bio.'}</p>
              </div>
              <div className="flex gap-4 flex-shrink-0 text-center">
                {[{l:'Entries',v:user.entry_count},{l:'Tracked by',v:user.tracked_by||0},{l:'Tracking',v:user.tracking_count},{l:'Strength',v:user.profile_strength}].map(s=>(
                  <div key={s.l}><p className="text-white font-bold text-[14px]">{s.v}</p><p className="text-white/30 text-[10px]">{s.l}</p></div>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/40 text-[11px]">Profile Strength</span>
                <span className="text-white/55 text-[11px]">{user.profile_strength}pts</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}} />
              </div>
            </div>

            <div className="flex border-b border-white/[0.08] mb-4">
              {(['secured','about'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)} className={`pb-3 mr-8 text-[13px] font-medium capitalize transition-colors ${tab===t?'text-white border-b-2 border-white':'text-white/30 hover:text-white/55'}`}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {tab==='secured' && (entries.length===0
              ? <p className="text-white/20 text-sm py-4">No entries yet.</p>
              : <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {entries.map(e=>(
                    <div key={e.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                      <p className="text-white/70 text-[11px] font-medium line-clamp-2 mb-1">{e.title||'Untitled'}</p>
                      <p className="text-white/30 text-[10px] mb-1">{e.platform||'—'}</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block ${(e.status||'').toLowerCase()==='flagged'?'bg-orange-500/20 text-orange-400':'bg-blue-500/20 text-blue-400'}`}>{e.status||'secured'}</span>
                    </div>
                  ))}
                </div>
            )}

            {tab==='about' && (
              <div className="space-y-3 py-2">
                {[{l:'Email',v:user.email},{l:'Joined',v:new Date(user.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})},{l:'Strength',v:`${user.profile_strength} pts`}].map(s=>(
                  <div key={s.l}><p className="text-white/35 text-[11px] mb-1">{s.l}</p><p className="text-white/70 text-[13px]">{s.v}</p></div>
                ))}
                <div><p className="text-white/35 text-[11px] mb-1">Status</p><StatusBadge status={user.status} /></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {ms==='flag'        && <FlagModal      user={user} onClose={()=>setMs('none')} onConfirm={doFlag} />}
      {ms==='flag_done'   && <Modal onClose={()=>{setMs('none');onClose()}} bc="border-orange-500/40"><div className="p-6 text-center"><p className="text-white font-bold mb-2">Account Flagged</p><p className="text-white/40 text-[12px]">@{user.username}: {reason}</p><button onClick={()=>{setMs('none');onClose()}} className="mt-4 w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Close</button></div></Modal>}
      {ms==='clear'       && <ClearFlagModal user={user} flagInfo={flagInfo} onClose={()=>setMs('none')} onConfirm={doClear} />}
      {ms==='clear_done'  && <Modal onClose={()=>{setMs('none');onClose()}} bc="border-green-500/40"><div className="p-6 text-center"><p className="text-white font-bold mb-2">Flag Cleared</p><p className="text-white/40 text-[12px]">@{user.username}'s flag has been cleared.</p><button onClick={()=>{setMs('none');onClose()}} className="mt-4 w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Close</button></div></Modal>}
      {ms==='delete'      && <DeleteModal    user={user} onClose={()=>setMs('none')} onConfirm={doDelete} />}
      {ms==='delete_done' && <Modal onClose={()=>{setMs('none');onClose()}} bc="border-red-500/40"><div className="p-6 text-center"><p className="text-white font-bold mb-2">Account Deleted</p><p className="text-white/40 text-[12px]">@{user.username} permanently removed.</p><button onClick={()=>{setMs('none');onClose()}} className="mt-4 w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Close</button></div></Modal>}
    </>
  )
}

export default function AdminUsers({ activeFilter='all' }: { activeFilter?:UserFilterType; onFilterChange?:(f:UserFilterType)=>void }) {
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [selUser, setSelUser] = useState<UserRow|null>(null)
  const [uptime,  setUptime]  = useState('—')
  const [startMs, setStartMs] = useState<number|null>(null)

  useEffect(()=>{
    if(!startMs) return
    const tick=()=>{ const s=Math.floor((Date.now()-startMs)/1000); setUptime(`${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`) }
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id)
  },[startMs])

  const fetch = useCallback(async () => {
    const {data:fu}=await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
    if(fu?.created_at) setStartMs(new Date(fu.created_at).getTime())

    const {data:ec}=await supabase.from('entries').select('user_id')
    const eMap: Record<string,number>={}
    ec?.forEach((e:any)=>{ eMap[e.user_id]=(eMap[e.user_id]||0)+1 })

    let q=supabase.from('users').select('id,username,email,avatar_url,status,profile_strength,created_at,bio',{count:'exact'})
    if(activeFilter==='flagged') q=q.eq('status','flagged')
    const {data,count}=await q.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1)

    const pUsers=data||[], ids=pUsers.map((u:any)=>u.id)

    const [{data:tRows},{data:tbRows}]=await Promise.all([
      supabase.from('trackers').select('tracker_id').in('tracker_id',ids),
      supabase.from('trackers').select('tracked_id').in('tracked_id',ids),
    ])
    const tMap: Record<string,number>={}, tbMap: Record<string,number>={}
    tRows?.forEach((r:any)=>{ tMap[r.tracker_id]=(tMap[r.tracker_id]||0)+1 })
    tbRows?.forEach((r:any)=>{ tbMap[r.tracked_id]=(tbMap[r.tracked_id]||0)+1 })

    let rows: UserRow[]=pUsers.map((u:any)=>({
      id:u.id, username:u.username||u.email?.split('@')[0]||'—', email:u.email||'—',
      avatar_url:u.avatar_url||null, status:u.status||'active', profile_strength:u.profile_strength||0,
      entry_count:eMap[u.id]||0, tracking_count:tMap[u.id]||0, tracked_by:tbMap[u.id]||0, created_at:u.created_at, bio:u.bio||'',
    }))

    if(activeFilter==='most')  rows=[...rows].sort((a,b)=>b.entry_count-a.entry_count)
    if(activeFilter==='least') rows=[...rows].sort((a,b)=>a.entry_count-b.entry_count)
    setUsers(rows); setTotal(count||0)
  },[activeFilter,page])

  useEffect(()=>{ fetch() },[fetch])

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-7">
        <div>
          <h1 className="text-white text-[22px] font-bold">User <span className="text-blue-400">Management</span></h1>
          <p className="text-white/35 text-sm mt-1">View, filter, and moderate all users across the platform.</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Uptime: <span className="text-white/55 font-mono">{uptime}</span></p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="grid rounded-xl bg-[#0d1529] mb-1" style={{gridTemplateColumns:'2.5fr 1.8fr 1.4fr 0.7fr 0.7fr 0.7fr'}}>
          {['User','Status','Strength','Entries','Tracking','Tracked by'].map(col=>(
            <div key={col} className="px-4 py-3.5"><span className="text-white/70 text-[12px] font-semibold">{col}</span></div>
          ))}
        </div>
        {users.length===0 ? <div className="py-16 text-center"><p className="text-white/20 text-sm">No users found.</p></div>
          : users.map((u,i)=>(
            <div key={u.id} onClick={()=>setSelUser(u)}
              className={`grid items-center py-4 cursor-pointer hover:bg-white/[0.025] rounded-xl transition-colors ${i<users.length-1?'border-b border-white/[0.05]':''}`}
              style={{gridTemplateColumns:'2.5fr 1.8fr 1.4fr 0.7fr 0.7fr 0.7fr'}}>
              <div className="px-3 flex items-center gap-3 min-w-0">
                <Avatar src={u.avatar_url} name={u.username} size="sm" />
                <div className="min-w-0"><p className="text-white text-[13px] font-medium truncate">{u.username}</p><p className="text-white/30 text-[11px] truncate">{u.email}</p></div>
              </div>
              <div className="px-3"><StatusBadge status={u.status} /><p className="text-white/25 text-[10px] mt-0.5 pl-3.5">{new Date(u.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p></div>
              <div className="px-3"><span className="text-white/80 text-[14px] font-medium">{u.profile_strength} pts</span></div>
              <div className="px-3"><span className="text-white/75 text-[14px]">{u.entry_count||'—'}</span></div>
              <div className="px-3"><span className="text-white/75 text-[14px]">{u.tracking_count||'—'}</span></div>
              <div className="px-3"><span className="text-white/75 text-[14px]">{u.tracked_by||'—'}</span></div>
            </div>
          ))
        }
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {users.length===0 ? <p className="text-white/20 text-sm text-center py-10">No users found.</p>
          : users.map(u=>(
            <div key={u.id} onClick={()=>setSelUser(u)} className="bg-[#0d1020] border border-white/[0.08] rounded-2xl p-4 cursor-pointer active:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={u.avatar_url} name={u.username} size="sm" />
                  <div className="min-w-0"><p className="text-white text-[14px] font-semibold truncate">@{u.username}</p><p className="text-white/35 text-[11px] truncate">{u.email}</p></div>
                </div>
                <StatusBadge status={u.status} />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.06]">
                {[{l:'Strength',v:`${u.profile_strength}pts`},{l:'Entries',v:u.entry_count||0},{l:'Tracking',v:u.tracking_count||0},{l:'Tracked by',v:u.tracked_by||0}].map(s=>(
                  <div key={s.l} className="text-center"><p className="text-white/80 text-[13px] font-semibold">{s.v}</p><p className="text-white/30 text-[10px]">{s.l}</p></div>
                ))}
              </div>
            </div>
          ))
        }
      </div>

      <Pagination current={page} total={Math.ceil(total/PAGE_SIZE)} onChange={setPage} />

      {selUser && <UserDetailModal user={selUser} onClose={()=>setSelUser(null)} onRefresh={()=>{fetch();setSelUser(null)}} />}
    </div>
  )
}