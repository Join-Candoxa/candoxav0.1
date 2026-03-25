// components/admin/AdminAnalytics.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const pts = data.length > 0 ? data : Array(12).fill(0)
  const W = 120, H = 50, max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1
  const d = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - ((p - min) / range) * (H - 8) - 4
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[2px] h-full w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-[2px] transition-all duration-500"
          style={{ height: `${Math.max((v/max)*100, v>0?4:0)}%`, background: i===data.length-1?'#3b82f6':`rgba(59,130,246,${(0.35+(v/max)*0.65).toFixed(2)})`, minHeight: v>0?'3px':'0' }} />
      ))}
    </div>
  )
}

const PLATFORMS = [
  { key:'youtube',   label:'Youtube',      icon:'/icons/youtube.png' },
  { key:'instagram', label:'Instagram',    icon:'/icons/instagram.png' },
  { key:'twitter',   label:'X (Formerly)', icon:'/icons/x.png' },
  { key:'linkedin',  label:'Linkedin',     icon:'/icons/linkedin.png' },
  { key:'others',    label:'Others',       icon:'/icons/others.png' },
]

const ICON_MAP: Record<string,string> = { youtube:'/icons/youtube.png', instagram:'/icons/instagram.png', twitter:'/icons/x.png', x:'/icons/x.png', linkedin:'/icons/linkedin.png' }
const getIcon = (p:string) => ICON_MAP[(p||'').toLowerCase()] ?? '/icons/others.png'

function timeAgo(d:string) {
  const m = Math.floor((Date.now()-new Date(d).getTime())/60000)
  if (m<1) return 'Now'; if (m<60) return `${m}m`
  const h = Math.floor(m/60); if (h<24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

function formatUptime(s:number) { return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s` }

function Row({ label, value, valueClass='text-white/65' }: { label:string; value:string; valueClass?:string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/38 text-[11px]">{label}</span>
      <span className={`text-[12px] flex-shrink-0 ${valueClass}`}>{value}</span>
    </div>
  )
}

export default function AdminAnalytics() {
  const [uptime,          setUptime]          = useState('—')
  const [platformStartMs, setPlatformStartMs] = useState<number|null>(null)
  const [stats,      setStats]      = useState({ activeToday:0,totalUsers:0,entriesToday:0,totalEntries:0,usersChange:0,entriesChange:0,activeChange:0 })
  const [pCounts,    setPCounts]    = useState<Record<string,number>>({})
  const [liveAct,    setLiveAct]    = useState<any[]>([])
  const [daily28,    setDaily28]    = useState<number[]>(Array(28).fill(0))
  const [eTrend,     setETrend]     = useState<number[]>(Array(12).fill(0))
  const [uTrend,     setUTrend]     = useState<number[]>(Array(12).fill(0))
  const [growth,     setGrowth]     = useState({ totalPairs:0,avgPerUser:0,newThisWeek:0,mostTracked:'—',totalReferrals:0,earlyBadge:0,conversionRate:0 })
  const [topUsers,   setTopUsers]   = useState<{username:string;count:number}[]>([])

  useEffect(() => {
    if (!platformStartMs) return
    const tick=()=>setUptime(formatUptime(Math.floor((Date.now()-platformStartMs)/1000)))
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id)
  }, [platformStartMs])

  useEffect(() => {
    const go = async () => {
      const now = new Date()
      const todayMid = new Date(now); todayMid.setHours(0,0,0,0)
      const yesterMid = new Date(todayMid); yesterMid.setDate(yesterMid.getDate()-1)
      const weekAgo = new Date(todayMid); weekAgo.setDate(weekAgo.getDate()-7)
      const monthAgo = new Date(todayMid); monthAgo.setDate(monthAgo.getDate()-28)
      const twelveAgo = new Date(now); twelveAgo.setDate(twelveAgo.getDate()-12)

      const {data:fu} = await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
      if (fu?.created_at) setPlatformStartMs(new Date(fu.created_at).getTime())

      const [{count:totalUsers},{count:usersWeek},{count:entriesToday},{count:totalEntries},{count:entriesWeek},{count:yest}] = await Promise.all([
        supabase.from('users').select('*',{count:'exact',head:true}),
        supabase.from('users').select('*',{count:'exact',head:true}).gte('created_at',weekAgo.toISOString()),
        supabase.from('entries').select('*',{count:'exact',head:true}).gte('secured_at',todayMid.toISOString()),
        supabase.from('entries').select('*',{count:'exact',head:true}),
        supabase.from('entries').select('*',{count:'exact',head:true}).gte('secured_at',weekAgo.toISOString()),
        supabase.from('entries').select('*',{count:'exact',head:true}).gte('secured_at',yesterMid.toISOString()).lt('secured_at',todayMid.toISOString()),
      ])
      setStats({ activeToday:entriesToday||0, totalUsers:totalUsers||0, entriesToday:entriesToday||0, totalEntries:totalEntries||0, usersChange:usersWeek||0, entriesChange:entriesWeek||0, activeChange:(entriesToday||0)-(yest||0) })

      const {data:pRows} = await supabase.from('entries').select('platform')
      const pc: Record<string,number> = {}
      pRows?.forEach((r:any)=>{ const k=(r.platform||'others').toLowerCase(); pc[k]=(pc[k]||0)+1 })
      setPCounts(pc)

      const {data:recent} = await supabase.from('entries').select('id,platform,secured_at,users(username)').order('secured_at',{ascending:false}).limit(8)
      setLiveAct(recent||[])

      // 28-day bar
      const {data:d28} = await supabase.from('entries').select('secured_at').gte('secured_at',monthAgo.toISOString())
      const b28=Array(28).fill(0); const nm=Date.now()
      d28?.forEach((r:any)=>{ const idx=27-Math.floor((nm-new Date(r.secured_at).getTime())/86400000); if(idx>=0&&idx<28)b28[idx]++ })
      setDaily28(b28)

      // 12-day sparklines — real data
      const [{data:eT},{data:uT}] = await Promise.all([
        supabase.from('entries').select('secured_at').gte('secured_at',twelveAgo.toISOString()),
        supabase.from('users').select('created_at').gte('created_at',twelveAgo.toISOString()),
      ])
      const eb=Array(12).fill(0), ub=Array(12).fill(0)
      eT?.forEach((r:any)=>{ const i=11-Math.floor((nm-new Date(r.secured_at).getTime())/86400000); if(i>=0&&i<12)eb[i]++ })
      uT?.forEach((r:any)=>{ const i=11-Math.floor((nm-new Date(r.created_at).getTime())/86400000); if(i>=0&&i<12)ub[i]++ })
      setETrend(eb); setUTrend(ub)

      // Top users
      const {data:allE} = await supabase.from('entries').select('user_id,users(username)').limit(2000)
      const um: Record<string,{username:string;count:number}> = {}
      allE?.forEach((e:any)=>{ const uid=e.user_id; if(!um[uid])um[uid]={username:e.users?.username||uid,count:0}; um[uid].count++ })
      const sorted = Object.values(um).sort((a,b)=>b.count-a.count)
      setTopUsers(sorted.slice(0,3))

      const tu=totalUsers||1, tp=totalEntries||0
      setGrowth({ totalPairs:tp, avgPerUser:Math.round(tp/tu), newThisWeek:entriesWeek||0, mostTracked:sorted[0]?.username||'—', totalReferrals:0, earlyBadge:0, conversionRate:0 })
    }
    go()
  }, [])

  const getPC = (k:string) => {
    if(k==='others'){const kn=new Set(['youtube','instagram','twitter','x','linkedin']); return Object.entries(pCounts).filter(([k])=>!kn.has(k)).reduce((s,[,v])=>s+v,0)}
    if(k==='twitter') return (pCounts['twitter']||0)+(pCounts['x']||0)
    return pCounts[k]||0
  }
  const totalP = Math.max(PLATFORMS.reduce((s,p)=>s+getPC(p.key),0),1)

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-[22px] font-bold">Platform <span className="text-blue-400">Overview</span></h1>
          <p className="text-white/35 text-sm mt-1">Real-time activity, growth trends, and key platform metrics.</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Uptime: <span className="text-white/55 font-mono">{uptime}</span></p>
        </div>
      </div>

      {/* Stats — 2 col mobile, 5 col desktop */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-4">
          <p className="text-white/40 text-xs mb-2">Active Today</p>
          <p className="text-white text-[26px] md:text-[38px] font-bold leading-none">{stats.activeToday}</p>
          <p className="text-white/28 text-[11px] mt-2">of <span className="text-white/55">{stats.totalUsers}</span></p>
          <div className="flex items-center gap-1 mt-2"><span className="text-green-400 text-xs font-semibold">▲ {Math.abs(stats.activeChange)}</span><span className="text-white/28 text-[10px]"> vs yesterday</span></div>
        </div>
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-4">
          <p className="text-white/40 text-xs mb-2">Entries Today</p>
          <p className="text-white text-[26px] md:text-[38px] font-bold leading-none">{stats.entriesToday}</p>
          <p className="text-white/28 text-[11px] mt-2">of <span className="text-white/55">{stats.totalEntries}</span></p>
          <div className="flex items-center gap-1 mt-2"><span className="text-green-400 text-xs font-semibold">▲ {stats.entriesChange}</span><span className="text-white/28 text-[10px]"> this week</span></div>
        </div>
        <div className="hidden md:flex bg-[#0d0d14] border border-white/[0.07] rounded-2xl p-4 items-center justify-center">
          <div className="w-full h-[72px]"><Sparkline data={eTrend} color="#3b82f6" /></div>
        </div>
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-4">
          <p className="text-white/40 text-xs mb-2">Total Users</p>
          <p className="text-white text-[26px] md:text-[38px] font-bold leading-none">{stats.totalUsers}</p>
          <div className="flex items-center gap-1 mt-4"><span className="text-green-400 text-xs font-semibold">▲ {stats.usersChange}</span><span className="text-white/28 text-[10px]"> this week</span></div>
        </div>
        <div className="hidden md:flex bg-[#0d0d14] border border-white/[0.07] rounded-2xl p-4 items-center justify-center">
          <div className="w-full h-[72px]"><Sparkline data={uTrend} color="#6366f1" /></div>
        </div>
      </div>

      {/* Bottom — stacked mobile, 3-col desktop */}
      <div className="flex flex-col md:grid gap-4" style={{ gridTemplateColumns:'1fr 1fr 268px' }}>

        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-semibold text-[15px] mb-1">Entries by Platform</h3>
            <p className="text-white/30 text-[11px] mb-4">Ranked by most secured entries</p>
            <div className="space-y-3">
              {PLATFORMS.map(p=>{
                const count=getPC(p.key), pct=(count/totalP)*100
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <Image src={p.icon} alt={p.label} width={20} height={20} className="rounded-[4px] flex-shrink-0" />
                    <span className="text-white/65 text-[13px] w-24 flex-shrink-0">{p.label}</span>
                    <div className="flex-1 h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}} />
                    </div>
                    <span className="text-white/35 text-[11px] w-12 text-right flex-shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white/55 text-[13px] font-medium mb-3">Daily Secured (28 days)</p>
            <div className="h-[100px]"><BarChart data={daily28} /></div>
          </div>
        </div>

        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-white font-semibold text-[15px] mb-4">Live Activity Feed</h3>
          <div className="space-y-4">
            {liveAct.length===0 ? <p className="text-white/25 text-sm">No recent activity.</p>
              : liveAct.map((e,i)=>(
                <div key={e.id??i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                    <Image src={getIcon(e.platform)} alt={e.platform??''} width={24} height={24} className="rounded-[3px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[13px] font-medium truncate">@{(e as any).users?.username??'user'}</p>
                    <p className="text-white/30 text-[11px]">secured a new {e.platform??'entry'}</p>
                  </div>
                  <span className="text-white/22 text-[11px] flex-shrink-0">{timeAgo(e.secured_at)}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="text-white font-semibold text-[15px] mb-3">Growth Trend</h3>
            <div className="space-y-2.5">
              <Row label="Total entries" value={growth.totalPairs.toLocaleString()} />
              <Row label="Avg per user"  value={String(growth.avgPerUser)} />
              <Row label="New this week" value={String(growth.newThisWeek)} valueClass="text-blue-400 font-semibold" />
              <Row label="Most active"   value={`@${growth.mostTracked}`} />
            </div>
          </div>
          <div className="border-t border-white/[0.06]" />
          <div>
            <h3 className="text-white font-semibold text-[13px] mb-3">Referral</h3>
            <div className="space-y-2.5">
              <Row label="Total Referrals"    value={String(growth.totalReferrals)} />
              <Row label="Early badge earned" value={String(growth.earlyBadge)} valueClass="text-blue-400 font-semibold" />
              <Row label="Conversion Rate"    value={`${growth.conversionRate}%`} valueClass="text-green-400 font-semibold" />
            </div>
          </div>
          <div className="border-t border-white/[0.06]" />
          <div>
            <h3 className="text-white font-semibold text-[13px] mb-3">Most Active</h3>
            <div className="space-y-2.5">
              {topUsers.length===0 ? <p className="text-white/20 text-xs">No data yet.</p>
                : topUsers.map((u,i)=><Row key={u.username} label={`@${u.username}`} value={u.count.toLocaleString()} valueClass={i===0?'text-green-400 font-semibold':'text-white/50'} />)
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}