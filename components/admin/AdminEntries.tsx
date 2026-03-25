// components/admin/AdminEntries.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const PAGE_SIZE = 20
export type EntryFilterType = 'all' | 'flagged' | 'most' | 'least'

interface EntryRow {
  id: string; title: string; url: string | null; platform: string
  user_id: string; username: string; status: string; points: number | null
  secured_at: string; screenshot_url: string | null; blockchain_ref: string | null; chain: string | null
}

const ICON_MAP: Record<string,string> = { youtube:'/icons/youtube.png', instagram:'/icons/instagram.png', twitter:'/icons/x.png', x:'/icons/x.png', linkedin:'/icons/linkedin.png' }
function PlatformIcon({ platform, size=28 }: { platform:string; size?:number }) {
  const src = ICON_MAP[(platform||'').toLowerCase()] ?? '/icons/others.png'
  return (
    <div className="rounded-[6px] bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden" style={{width:size,height:size}}>
      <Image src={src} alt={platform} width={size-8} height={size-8} className="rounded-[3px]" />
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const s=(status||'secured').toLowerCase()
  const cfg: Record<string,{dot:string;text:string;label:string}> = {
    secured:{dot:'bg-blue-500',  text:'text-blue-400',  label:'Secured'},
    flagged:{dot:'bg-orange-400',text:'text-orange-400',label:'Flagged'},
    deleted:{dot:'bg-red-500',   text:'text-red-400',   label:'Deleted'},
  }
  const c=cfg[s]??{dot:'bg-white/30',text:'text-white/40',label:status}
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#111118] border border-white/[0.08] rounded-full px-2.5 py-[5px]">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className={`text-[11px] font-medium ${c.text}`}>{c.label}</span>
    </span>
  )
}

function FlagSVG({className=''}:{className?:string}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}
function TrashSVG({className=''}:{className?:string}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
}
function ReceiptSVG({className=''}:{className?:string}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 00-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V4a2 2 0 00-2-2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg>
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

function fmtDate(d:string) { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) }
function fmtDateTime(d:string) { return fmtDate(d)+' · '+new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' UTC' }

function timeAgoShort(d:string) {
  const m=Math.floor((Date.now()-new Date(d).getTime())/60000)
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}

async function getAdminEmail() {
  const {data:{session}}=await supabase.auth.getSession()
  return session?.user?.email||'admin'
}

async function fetchFlagInfo(entryId: string) {
  const {data}=await supabase.from('admin_logs')
    .select('admin_email,created_at').eq('target_id',entryId)
    .ilike('action','%flag%').not('action','ilike','%clear%')
    .order('created_at',{ascending:false}).limit(1).single()
  return data
}

const FLAG_REASONS   = ['Spam / Bot activity','Possible duplicate Entry','Fabricated stats suspected','Fake account','Inappropriate content','Other']
const DELETE_REASONS = ['Spam / Bot activity','Possible duplicate Entry','Fake account','Terms violation','Other']

function Modal({ children, onClose, bc='border-white/[0.12]', maxW='520px' }: { children:React.ReactNode; onClose:()=>void; bc?:string; maxW?:string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative bg-[#0e0e14] border rounded-2xl overflow-hidden shadow-2xl w-full max-h-[90vh] overflow-y-auto" style={{borderColor:bc.replace('border-',''),maxWidth:maxW}}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white z-10">✕</button>
        {children}
      </div>
    </div>
  )
}

function EntryPreview({ entry }: { entry:EntryRow }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3">
      <PlatformIcon platform={entry.platform} size={28} />
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-[13px] font-medium truncate">{entry.title}</p>
        {entry.url&&<p className="text-white/30 text-[11px] truncate">{entry.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,40)}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white/55 text-[12px] font-medium">@{entry.username}</p>
        <p className="text-white/25 text-[10px]">{fmtDate(entry.secured_at)}</p>
      </div>
    </div>
  )
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ entry, flagInfo, onClose, onFlag, onClear, onRemove }: { entry:EntryRow; flagInfo:any; onClose:()=>void; onFlag:()=>void; onClear:()=>void; onRemove:()=>void }) {
  const isFlagged=(entry.status||'').toLowerCase()==='flagged'
  return (
    <Modal onClose={onClose} bc="rgba(99,102,241,0.5)" maxW="480px">
      <div className="relative w-full h-48 bg-[#0a0a12] overflow-hidden">
        {entry.screenshot_url
          ? <img src={entry.screenshot_url} alt="screenshot" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><PlatformIcon platform={entry.platform} size={48} /></div>
        }
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white text-[10px] font-semibold">Onchain Human Readable Receipt</span>
        </div>
      </div>
      <div className="p-5">
        <h2 className="text-white font-bold text-[17px] mb-4 text-center">{entry.title}</h2>

        {isFlagged && flagInfo && (
          <div className="bg-yellow-500/10 border-l-4 border-yellow-400 rounded-r-xl px-4 py-3 mb-4">
            <p className="text-yellow-300 text-[12px] font-semibold mb-0.5">Flagged & Under Review</p>
            <p className="text-yellow-300/35 text-[10px]">By {flagInfo.admin_email} · {timeAgoShort(flagInfo.created_at)}</p>
          </div>
        )}
        {!isFlagged && (entry.status||'').toLowerCase()==='secured' && (
          <div className="bg-green-500/10 border-l-4 border-green-400 rounded-r-xl px-4 py-3 mb-4">
            <p className="text-green-300 text-[12px] font-semibold">Entry OK — no violations found</p>
          </div>
        )}

        <div className="space-y-0 divide-y divide-white/[0.05] border border-white/[0.07] rounded-xl overflow-hidden mb-5">
          {[
            {label:'Secured On', value:fmtDateTime(entry.secured_at)},
            {label:'Creator',    value:`@${entry.username}`, accent:true},
            {label:'Platform',   value:entry.platform||'—'},
            {label:'Status',     value:null, pill:true},
            {label:'Blockchain Ref', value:entry.blockchain_ref?entry.blockchain_ref.slice(0,18)+'...':'—'},
            {label:'Chain',      value:entry.chain||'—'},
          ].map((row:any)=>(
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d14]">
              <span className="text-white/35 text-[12px]">{row.label}</span>
              {row.pill ? <StatusPill status={entry.status} /> : <span className={`text-[12px] ${row.accent?'text-blue-400':'text-white/65'}`}>{row.value}</span>}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {isFlagged
            ? <>
                <button onClick={onClear} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[13px] font-semibold">Clear Flag <FlagSVG className="w-3.5 h-3.5"/></button>
                <button onClick={onRemove} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a24] border border-white/[0.10] text-white/70 hover:text-white text-[13px] font-semibold">Remove <TrashSVG className="w-3.5 h-3.5"/></button>
              </>
            : <>
                <button onClick={onFlag} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-[13px] font-semibold">Flag <FlagSVG className="w-3.5 h-3.5"/></button>
                <button onClick={onRemove} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[13px] font-semibold">Remove <TrashSVG className="w-3.5 h-3.5"/></button>
              </>
          }
        </div>
      </div>
    </Modal>
  )
}

function FlagModal({ entry, onClose, onConfirm }: { entry:EntryRow; onClose:()=>void; onConfirm:(r:string)=>void }) {
  const [reason,setReason]=useState('')
  return (
    <Modal onClose={onClose} bc="rgba(249,115,22,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4"><FlagSVG className="w-7 h-7 text-orange-400"/></div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Flag @{entry.username}'s Entry?</h2>
        <p className="text-white/35 text-[12px] mb-4 leading-relaxed">Entry stays visible but is queued for review. This action is logged.</p>
        <EntryPreview entry={entry} />
        <div className="text-left mt-4 mb-5">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Reason for Flag •</label>
          <select value={reason} onChange={e=>setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/55 text-[13px] outline-none appearance-none">
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

function ClearFlagModal({ entry, flagInfo, onClose, onConfirm }: { entry:EntryRow; flagInfo:any; onClose:()=>void; onConfirm:(n:string)=>void }) {
  const [note,setNote]=useState('')
  return (
    <Modal onClose={onClose} bc="rgba(34,197,94,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"><FlagSVG className="w-7 h-7 text-green-400"/></div>
        <h2 className="text-white font-bold text-[16px] mb-1.5">Clear Flag on @{entry.username}'s Entry?</h2>
        <EntryPreview entry={entry} />
        {flagInfo && <p className="text-orange-400/70 text-[11px] text-left mt-3 mb-3">Flagged by {flagInfo.admin_email} · {timeAgoShort(flagInfo.created_at)}</p>}
        <div className="text-left mb-5">
          <label className="text-white/40 text-[11px] font-medium mb-1.5 block">Clearance Note (Optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="e.g. Reviewed screenshot — verified as authentic"
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/55 text-[13px] outline-none resize-none placeholder-white/20" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Cancel</button>
          <button onClick={()=>onConfirm(note)} className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[13px] font-semibold">Clear Flag</button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteModal({ entry, onClose, onConfirm }: { entry:EntryRow; onClose:()=>void; onConfirm:(r:string)=>void }) {
  const [reason,setReason]=useState('')
  return (
    <Modal onClose={onClose} bc="rgba(239,68,68,0.45)">
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><TrashSVG className="w-7 h-7 text-red-400"/></div>
        <h2 className="text-white font-bold text-[16px] mb-4">Delete @{entry.username}'s Entry?</h2>
        <EntryPreview entry={entry} />
        <div className="text-left mt-4 mb-4">
          <label className="text-white/45 text-[11px] font-medium mb-1.5 block">Reason •</label>
          <select value={reason} onChange={e=>setReason(e.target.value)}
            className="w-full bg-[#0a0a12] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white/55 text-[13px] outline-none appearance-none">
            <option value="">Select Reason</option>
            {DELETE_REASONS.map(r=><option key={r} value={r} style={{background:'#0a0a12'}}>{r}</option>)}
          </select>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 text-left mb-5">
          <p className="text-red-300 text-[12px] font-semibold mb-1">Permanent and irreversible</p>
          <p className="text-red-300/55 text-[11px]">The on-chain timestamp remains but the entry is delisted from all public views.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Cancel</button>
          <button onClick={()=>reason&&onConfirm(reason)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${reason?'bg-red-500 hover:bg-red-400 text-white':'bg-red-500/20 text-red-300/40 cursor-not-allowed'}`}>Remove Permanently</button>
        </div>
      </div>
    </Modal>
  )
}

type MS = 'receipt'|'flag'|'flag_done'|'delete'|'delete_done'|'clear'|'clear_done'

function EntryModalsWrapper({ entry, init, onClose, onRefresh }: { entry:EntryRow; init:MS; onClose:()=>void; onRefresh:()=>void }) {
  const [ms,      setMs]      = useState<MS>(init)
  const [reason,  setReason]  = useState('')
  const [flagInfo,setFlagInfo]= useState<any>(null)

  useEffect(()=>{ if((entry.status||'').toLowerCase()==='flagged') fetchFlagInfo(entry.id).then(setFlagInfo) },[entry.id])

  const doFlag = async (r:string) => {
    const ae=await getAdminEmail()
    await Promise.all([
      supabase.from('entries').update({status:'flagged'}).eq('id',entry.id),
      supabase.from('admin_logs').insert({admin_email:ae,action:'Flagged Entry',target_type:'entry',target_id:entry.id,target_label:entry.title,description:r}),
    ])
    setReason(r); setMs('flag_done'); onRefresh()
  }

  const doDelete = async (r:string) => {
    const ae=await getAdminEmail()
    await supabase.from('admin_logs').insert({admin_email:ae,action:'Deleted Entry',target_type:'entry',target_id:entry.id,target_label:entry.title,description:r})
    await supabase.from('entries').delete().eq('id',entry.id)
    setReason(r); setMs('delete_done'); onRefresh()
  }

  const doClear = async (note:string) => {
    const ae=await getAdminEmail()
    await Promise.all([
      supabase.from('entries').update({status:'secured'}).eq('id',entry.id),
      supabase.from('admin_logs').insert({admin_email:ae,action:'Clear Flag (Entry)',target_type:'entry',target_id:entry.id,target_label:entry.title,description:note||'Flag cleared'}),
    ])
    setReason(note); setMs('clear_done'); onRefresh()
  }

  const close=()=>{ setMs('receipt'); onClose() }

  if(ms==='receipt')    return <ReceiptModal   entry={entry} flagInfo={flagInfo} onClose={close} onFlag={()=>setMs('flag')} onClear={()=>setMs('clear')} onRemove={()=>setMs('delete')} />
  if(ms==='flag')       return <FlagModal      entry={entry} onClose={()=>setMs('receipt')} onConfirm={doFlag} />
  if(ms==='flag_done')  return <Modal onClose={close} bc="rgba(249,115,22,0.45)"><div className="p-6 text-center"><p className="text-white font-bold mb-2">Entry Flagged</p><p className="text-white/40 text-[12px] mb-4">{reason}</p><button onClick={close} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Close</button></div></Modal>
  if(ms==='delete')     return <DeleteModal    entry={entry} onClose={()=>setMs('receipt')} onConfirm={doDelete} />
  if(ms==='delete_done')return <Modal onClose={close} bc="rgba(239,68,68,0.45)"><div className="p-6 text-center"><p className="text-white font-bold mb-2">Entry Deleted</p><p className="text-white/40 text-[12px] mb-4">{reason}</p><button onClick={close} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Close</button></div></Modal>
  if(ms==='clear')      return <ClearFlagModal entry={entry} flagInfo={flagInfo} onClose={()=>setMs('receipt')} onConfirm={doClear} />
  if(ms==='clear_done') return <Modal onClose={close} bc="rgba(34,197,94,0.45)"><div className="p-6 text-center"><p className="text-white font-bold mb-2">Flag Cleared</p><p className="text-white/40 text-[12px] mb-4">{reason||'Entry restored.'}</p><button onClick={close} className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/55 text-[13px]">Close</button></div></Modal>
  return null
}

function timeAgoEntry(d:string) {
  const m=Math.floor((Date.now()-new Date(d).getTime())/60000)
  if(m<1) return 'Now'; if(m<60) return `${m} mins`
  const h=Math.floor(m/60); if(h<24) return `${h} hrs ago`
  const days=Math.floor(h/24); if(days<7) return `${days}d ago`
  return fmtDate(d)
}

export default function AdminEntries({ activeFilter='all' }: { activeFilter?:EntryFilterType }) {
  const [entries,   setEntries]   = useState<EntryRow[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [selEntry,  setSelEntry]  = useState<{entry:EntryRow;init:MS}|null>(null)
  const [uptime,    setUptime]    = useState('—')
  const [startMs,   setStartMs]   = useState<number|null>(null)

  useEffect(()=>{
    if(!startMs) return
    const tick=()=>{ const s=Math.floor((Date.now()-startMs)/1000); setUptime(`${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`) }
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id)
  },[startMs])

  const fetch = useCallback(async () => {
    const {data:fu}=await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
    if(fu?.created_at) setStartMs(new Date(fu.created_at).getTime())

    let q=supabase.from('entries')
      .select('id,title,url,platform,user_id,status,secured_at,points,screenshot_url,blockchain_ref,chain,users(username)',{count:'exact'})
      .order('secured_at',{ascending:false})
    if(activeFilter==='flagged') q=q.eq('status','flagged')
    const {data,count}=await q.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1)

    let rows: EntryRow[]=(data||[]).map((e:any)=>({
      id:e.id,title:e.title||'Untitled',url:e.url||null,platform:e.platform||'others',
      user_id:e.user_id,username:e.users?.username||'—',status:e.status||'secured',
      points:e.points??null,secured_at:e.secured_at,screenshot_url:e.screenshot_url||null,
      blockchain_ref:e.blockchain_ref||null,chain:e.chain||null,
    }))
    if(activeFilter==='most')  rows=[...rows].sort((a,b)=>(b.points??0)-(a.points??0))
    if(activeFilter==='least') rows=[...rows].sort((a,b)=>(a.points??0)-(b.points??0))
    setEntries(rows); setTotal(count||0)
  },[activeFilter,page])

  useEffect(()=>{ fetch() },[fetch])

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-7">
        <div>
          <h1 className="text-white text-[22px] font-bold">Entry <span className="text-blue-400">Management</span></h1>
          <p className="text-white/35 text-sm mt-1">View, filter, and moderate all secured entries across the platform.</p>
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
        <div className="grid rounded-xl bg-[#0d1529] mb-1" style={{gridTemplateColumns:'2.8fr 1fr 1.1fr 2fr'}}>
          {['Entry','User','Status','Control'].map(col=>(
            <div key={col} className="px-4 py-3.5"><span className="text-white/70 text-[12px] font-semibold">{col}</span></div>
          ))}
        </div>
        {entries.length===0 ? <div className="py-16 text-center"><p className="text-white/20 text-sm">No entries found.</p></div>
          : entries.map((e,i)=>(
            <div key={e.id} className={`grid items-center py-3.5 hover:bg-white/[0.02] rounded-xl transition-colors ${i<entries.length-1?'border-b border-white/[0.05]':''}`} style={{gridTemplateColumns:'2.8fr 1fr 1.1fr 2fr'}}>
              <div className="px-3 flex items-start gap-3 min-w-0 cursor-pointer" onClick={()=>setSelEntry({entry:e,init:'receipt'})}>
                <PlatformIcon platform={e.platform} />
                <div className="min-w-0">
                  <p className="text-white/85 text-[13px] font-medium leading-tight truncate">{e.title}</p>
                  {e.url&&<p className="text-white/28 text-[11px] truncate mt-0.5">{e.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,45)}</p>}
                  <p className="text-white/20 text-[10px] mt-0.5">{timeAgoEntry(e.secured_at)}</p>
                </div>
              </div>
              <div className="px-3"><span className="text-white/70 text-[13px]">@{e.username}</span></div>
              <div className="px-3 flex flex-col gap-1">
                {e.points!=null&&<span className="text-white text-[12px] font-semibold">+{e.points} Pts</span>}
                <StatusPill status={e.status} />
              </div>
              <div className="px-3 flex items-center gap-2">
                <button onClick={()=>setSelEntry({entry:e,init:(e.status||'').toLowerCase()==='flagged'?'clear':'flag'})}
                  className={`inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold border transition-all
                    ${(e.status||'').toLowerCase()==='flagged'?'bg-[#0e0e14] border-green-500/50 text-white/70 hover:border-green-400':'bg-[#0e0e14] border-white/[0.10] text-white/60 hover:text-white hover:border-orange-400/50'}`}>
                  {(e.status||'').toLowerCase()==='flagged'?'Clear':'Flag'}
                  <FlagSVG className="w-2.5 h-2.5"/>
                </button>
                <button onClick={()=>setSelEntry({entry:e,init:'delete'})}
                  className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold bg-[#0e0e14] border border-red-500/40 text-white/60 hover:text-white hover:border-red-400">
                  Remove <TrashSVG className="w-2.5 h-2.5 text-red-400"/>
                </button>
                <button onClick={()=>setSelEntry({entry:e,init:'receipt'})}
                  className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold bg-blue-600 border border-blue-600 text-white hover:bg-blue-500">
                  Receipt <ReceiptSVG className="w-2.5 h-2.5"/>
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {entries.length===0 ? <p className="text-white/20 text-sm text-center py-10">No entries found.</p>
          : entries.map(e=>(
            <div key={e.id} className="bg-[#0d1020] border border-white/[0.08] rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-3 cursor-pointer" onClick={()=>setSelEntry({entry:e,init:'receipt'})}>
                <PlatformIcon platform={e.platform} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 text-[14px] font-semibold leading-tight">{e.title}</p>
                  <p className="text-white/35 text-[11px] mt-0.5">@{e.username} · {timeAgoEntry(e.secured_at)}</p>
                </div>
                <StatusPill status={e.status} />
              </div>
              <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                <button onClick={()=>setSelEntry({entry:e,init:(e.status||'').toLowerCase()==='flagged'?'clear':'flag'})}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors
                    ${(e.status||'').toLowerCase()==='flagged'?'border-green-500/40 text-green-400 bg-green-500/10':'border-orange-500/30 text-orange-400 bg-orange-500/10'}`}>
                  {(e.status||'').toLowerCase()==='flagged'?'Clear':'Flag'}
                </button>
                <button onClick={()=>setSelEntry({entry:e,init:'delete'})} className="flex-1 py-2 rounded-xl text-[12px] font-semibold border border-red-500/30 text-red-400 bg-red-500/10">Remove</button>
                <button onClick={()=>setSelEntry({entry:e,init:'receipt'})} className="flex-1 py-2 rounded-xl text-[12px] font-semibold bg-blue-600 text-white">Receipt</button>
              </div>
            </div>
          ))
        }
      </div>

      <Pagination current={page} total={Math.ceil(total/PAGE_SIZE)} onChange={setPage} />

      {selEntry && (
        <EntryModalsWrapper entry={selEntry.entry} init={selEntry.init} onClose={()=>setSelEntry(null)} onRefresh={fetch} />
      )}
    </div>
  )
}