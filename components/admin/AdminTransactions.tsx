// components/admin/AdminTransactions.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function RevenueBarChart({ data }: { data: { month:string; amount:number }[] }) {
  const max = Math.max(...data.map(d=>d.amount),1)
  return (
    <div>
      <div className="flex items-end gap-2.5 h-[110px] w-full">
        {data.map((d,i)=>(
          <div key={i} className="flex-1 flex flex-col justify-end">
            <div className="w-full rounded-t-[4px] transition-all duration-700"
              style={{height:`${Math.max((d.amount/max)*100,d.amount>0?6:3)}%`,background:`rgba(59,130,246,${(0.35+(d.amount/max)*0.65).toFixed(2)})`,minHeight:'4px'}} />
          </div>
        ))}
      </div>
      <div className="flex gap-2.5 mt-2">
        {data.map((d,i)=><div key={i} className="flex-1 text-center"><span className="text-white/25 text-[9px]">{d.month}</span></div>)}
      </div>
    </div>
  )
}

function PlanBar({ label,count,total,bg,tc='text-white' }: { label:string; count:number; total:number; bg:string; tc?:string }) {
  const pct=total>0?Math.round((count/total)*100):0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center rounded-[5px] overflow-hidden h-[38px] bg-white/[0.03]">
        <div className="h-full flex items-center px-3 flex-shrink-0 transition-all duration-700" style={{width:`${Math.max(pct,6)}%`,background:bg}}>
          <span className={`text-[11px] font-bold tracking-wider whitespace-nowrap ${tc}`}>{label}</span>
        </div>
      </div>
      <span className="text-white/45 text-[12px] w-[64px] text-right flex-shrink-0">{count} ({pct}%)</span>
    </div>
  )
}

function StatusBadge({ status }: { status:string }) {
  const s=(status||'').toLowerCase()
  if(s==='paid')     return <span className="text-green-400  text-[13px] font-medium">Paid</span>
  if(s==='refunded') return <span className="text-orange-400 text-[13px] font-medium">Refunded</span>
  if(s==='failed')   return <span className="text-red-400   text-[13px] font-medium">Failed</span>
  return <span className="text-white/40 text-[13px]">{status}</span>
}

function PlanPill({ plan }: { plan:string }) {
  const p=(plan||'').toLowerCase()
  if(p.includes('annual'))  return <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">Pro Annual</span>
  if(p.includes('pro'))     return <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-600/30 border border-blue-500/40 text-blue-200">Pro Monthly</span>
  return <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-green-600/20 border border-green-500/30 text-green-300">Free</span>
}

function AmountCell({ amount, status }: { amount:number|null; status:string }) {
  const s=(status||'').toLowerCase()
  if(s==='failed')   return <span className="text-white/30 text-[13px]">— — —</span>
  if(amount==null)   return <span className="text-white/30 text-[13px]">—</span>
  if(s==='refunded') return <span className="text-red-400 text-[13px] font-medium">- ${amount}</span>
  return <span className="text-green-400 text-[13px] font-medium">${amount}</span>
}

function formatUptime(s:number) { return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s` }

export default function AdminTransactions() {
  const [uptime,         setUptime]         = useState('—')
  const [startMs,        setStartMs]        = useState<number|null>(null)
  const [transactions,   setTransactions]   = useState<any[]>([])
  const [stats, setStats] = useState({ mrr:0,mrrChange:0,totalRevenue:0,activeSubs:0,failedPayments:0 })
  const [revenueByMonth, setRevenueByMonth] = useState<{month:string;amount:number}[]>([])
  const [planCounts,     setPlanCounts]     = useState({proMonthly:0,proAnnual:0,free:0})

  useEffect(()=>{
    if(!startMs) return
    const tick=()=>setUptime(formatUptime(Math.floor((Date.now()-startMs)/1000)))
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id)
  },[startMs])

  useEffect(()=>{
    const go=async()=>{
      const {data:fu}=await supabase.from('users').select('created_at').order('created_at',{ascending:true}).limit(1).single()
      if(fu?.created_at) setStartMs(new Date(fu.created_at).getTime())

      const {data:txns}=await supabase.from('transactions').select('*,users(username)').order('created_at',{ascending:false}).limit(100)
      const all=txns||[]; setTransactions(all)

      const now=new Date(), thisMonth=new Date(now.getFullYear(),now.getMonth(),1), lastMonth=new Date(now.getFullYear(),now.getMonth()-1,1)
      const paid=all.filter(t=>(t.status||'').toLowerCase()==='paid')
      const paidThis=paid.filter(t=>new Date(t.created_at)>=thisMonth)
      const paidLast=paid.filter(t=>new Date(t.created_at)>=lastMonth&&new Date(t.created_at)<thisMonth)
      const failed=all.filter(t=>(t.status||'').toLowerCase()==='failed')
      const active=all.filter(t=>(t.status||'').toLowerCase()==='paid'&&t.plan&&!t.plan.toLowerCase().includes('free'))
      const mrr=paidThis.reduce((s,t)=>s+(t.amount||0),0)
      const mrrLast=paidLast.reduce((s,t)=>s+(t.amount||0),0)
      const total=paid.reduce((s,t)=>s+(t.amount||0),0)
      setStats({mrr,mrrChange:mrrLast>0?Math.round(((mrr-mrrLast)/mrrLast)*100):0,totalRevenue:total,activeSubs:active.length,failedPayments:failed.length})

      const months: {month:string;amount:number}[]=[]
      for(let i=7;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1)
        const start=new Date(d.getFullYear(),d.getMonth(),1), end=new Date(d.getFullYear(),d.getMonth()+1,1)
        months.push({month:d.toLocaleString('default',{month:'short'}),amount:paid.filter(t=>new Date(t.created_at)>=start&&new Date(t.created_at)<end).reduce((s,t)=>s+(t.amount||0),0)})
      }
      setRevenueByMonth(months)

      const {data:ud}=await supabase.from('users').select('plan').limit(5000)
      const plans=(ud||[]).map((u:any)=>(u.plan||'free').toLowerCase())
      setPlanCounts({proMonthly:plans.filter(p=>p.includes('monthly')).length,proAnnual:plans.filter(p=>p.includes('annual')).length,free:plans.filter(p=>!p.includes('pro')).length})
    }
    go()
  },[])

  const total=planCounts.proMonthly+planCounts.proAnnual+planCounts.free

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-7">
        <div>
          <h1 className="text-white text-[22px] font-bold">Payment <span className="text-blue-400">Dashboard</span></h1>
          <p className="text-white/35 text-sm mt-1">Revenue overview, transaction log, and manual payment actions.</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /><span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">Uptime: <span className="text-white/55 font-mono">{uptime}</span></p>
        </div>
      </div>

      {/* Stats — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {label:'MRR',                 value:`$${stats.mrr.toLocaleString()}`,           sub:`▲ ${Math.abs(stats.mrrChange)}% vs last month`},
          {label:'Total Revenue',       value:`$${stats.totalRevenue.toLocaleString()}`,   sub:'All time'},
          {label:'Active Subscriptions',value:stats.activeSubs.toLocaleString(),           sub:'All time'},
          {label:'Failed Payments',     value:String(stats.failedPayments),                sub:'Needs attention'},
        ].map(s=>(
          <div key={s.label} className="bg-[#0d0d12] rounded-2xl px-4 md:px-6 py-4 md:py-5">
            <p className="text-white text-[22px] md:text-[36px] font-bold tracking-tight leading-none mb-2">{s.value}</p>
            <p className="text-blue-400 text-[12px] md:text-[13px] font-semibold mb-1">{s.label}</p>
            <p className="text-white/30 text-[10px] md:text-[11px]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts — stacked mobile, 2-col desktop */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5">
          <p className="text-white/55 text-[13px] font-medium mb-5">Revenue (Last 8 Months)</p>
          <RevenueBarChart data={revenueByMonth} />
        </div>
        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5 flex flex-col justify-center gap-4">
          <PlanBar label="PRO MONTHLY" count={planCounts.proMonthly} total={total} bg="#2563eb" tc="text-white" />
          <PlanBar label="PRO ANNUAL"  count={planCounts.proAnnual}  total={total} bg="#92400e" tc="text-yellow-100" />
          <PlanBar label="FREE"        count={planCounts.free}        total={total} bg="#15803d" tc="text-white" />
        </div>
      </div>

      {/* Transaction table — desktop */}
      <div className="bg-[#0d0d12] rounded-2xl overflow-hidden hidden md:block">
        <div className="grid bg-[#0d1529]" style={{gridTemplateColumns:'1.8fr 1.5fr 1.4fr 1fr 1fr'}}>
          {['txn_ID','User','Plan','Amount','Status'].map(col=>(
            <div key={col} className="px-6 py-4"><span className="text-white/70 text-[12px] font-semibold">{col}</span></div>
          ))}
        </div>
        {transactions.length===0
          ? <div className="px-6 py-12 text-center"><p className="text-white/25 text-sm">No transactions yet.</p></div>
          : transactions.map((t,i)=>(
            <div key={t.id??i} className="grid border-t border-white/[0.04] hover:bg-white/[0.02]" style={{gridTemplateColumns:'1.8fr 1.5fr 1.4fr 1fr 1fr'}}>
              <div className="px-6 py-4"><span className="text-white/45 text-[12px] font-mono">{(t.id||'').toString().slice(0,14)}</span></div>
              <div className="px-6 py-4"><span className="text-white/75 text-[13px]">@{t.users?.username??t.user_id??'—'}</span></div>
              <div className="px-6 py-4"><PlanPill plan={t.plan??''} /></div>
              <div className="px-6 py-4"><AmountCell amount={t.amount} status={t.status??''} /></div>
              <div className="px-6 py-4"><StatusBadge status={t.status??''} /></div>
            </div>
          ))
        }
      </div>

      {/* Transaction cards — mobile */}
      <div className="md:hidden flex flex-col gap-3">
        <p className="text-white/55 text-[13px] font-semibold uppercase tracking-wider px-1">Transactions</p>
        {transactions.length===0
          ? <p className="text-white/20 text-sm py-6 text-center">No transactions yet.</p>
          : transactions.map((t,i)=>(
            <div key={t.id??i} className="bg-[#0d0d12] border border-white/[0.07] rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white/75 text-[14px] font-semibold">@{t.users?.username??t.user_id??'—'}</p>
                  <p className="text-white/30 text-[11px] font-mono mt-0.5">{(t.id||'').toString().slice(0,16)}</p>
                </div>
                <StatusBadge status={t.status??''} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <PlanPill plan={t.plan??''} />
                <AmountCell amount={t.amount} status={t.status??''} />
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}