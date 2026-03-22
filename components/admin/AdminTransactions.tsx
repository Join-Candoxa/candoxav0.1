// components/admin/AdminTransactions.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Revenue bar chart (8 months) ────────────────────────────────────────────
function RevenueBarChart({ data }: { data: { month: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  return (
    <div>
      <div className="flex items-end gap-2.5 h-[110px] w-full">
        {data.map((d, i) => {
          const heightPct = Math.max((d.amount / max) * 100, d.amount > 0 ? 6 : 3)
          const opacity   = 0.35 + (d.amount / max) * 0.65
          return (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t-[4px] transition-all duration-700"
                style={{
                  height: `${heightPct}%`,
                  background: `rgba(59,130,246,${opacity.toFixed(2)})`,
                  minHeight: '4px',
                }}
              />
            </div>
          )
        })}
      </div>
      {/* Month labels */}
      <div className="flex gap-2.5 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-white/25 text-[9px]">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Plan distribution bar ────────────────────────────────────────────────────
function PlanBar({
  label,
  count,
  total,
  bg,
  textColor = 'text-white',
}: {
  label: string
  count: number
  total: number
  bg: string
  textColor?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const filledWidth = `${Math.max(pct, 6)}%`

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center rounded-[5px] overflow-hidden h-[38px] bg-white/[0.03]">
        <div
          className="h-full flex items-center px-3 flex-shrink-0 transition-all duration-700"
          style={{ width: filledWidth, background: bg }}
        >
          <span className={`text-[11px] font-bold tracking-wider whitespace-nowrap ${textColor}`}>
            {label}
          </span>
        </div>
      </div>
      <span className="text-white/45 text-[12px] w-[64px] text-right flex-shrink-0">
        {count} ({pct}%)
      </span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'paid')     return <span className="text-green-400  text-[13px] font-medium">Paid</span>
  if (s === 'refunded') return <span className="text-orange-400 text-[13px] font-medium">Refunded</span>
  if (s === 'failed')   return <span className="text-red-400   text-[13px] font-medium">Failed</span>
  return <span className="text-white/40 text-[13px]">{status}</span>
}

function PlanPill({ plan }: { plan: string }) {
  const p = (plan || '').toLowerCase()
  if (p.includes('annual'))
    return <span className="px-3 py-1 rounded text-[11px] font-semibold bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">Pro Annual</span>
  if (p.includes('pro'))
    return <span className="px-3 py-1 rounded text-[11px] font-semibold bg-blue-600/30 border border-blue-500/40 text-blue-200">Pro Monthly</span>
  return <span className="px-3 py-1 rounded text-[11px] font-semibold bg-green-600/20 border border-green-500/30 text-green-300">Free</span>
}

function AmountCell({ amount, status }: { amount: number | null; status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'failed')              return <span className="text-white/30 text-[13px]">— — —</span>
  if (amount == null)              return <span className="text-white/30 text-[13px]">—</span>
  if (s === 'refunded')            return <span className="text-red-400   text-[13px] font-medium">- ${amount}</span>
  return <span className="text-green-400 text-[13px] font-medium">${amount}</span>
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${d}d ${h}h ${m}m ${s}s`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminTransactions() {
  const [uptime,          setUptime]          = useState('—')
  const [platformStartMs, setPlatformStartMs] = useState<number | null>(null)
  const [transactions,    setTransactions]    = useState<any[]>([])
  const [stats, setStats] = useState({
    mrr: 0, mrrChange: 0,
    totalRevenue: 0,
    activeSubs: 0,
    failedPayments: 0,
  })
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; amount: number }[]>([])
  const [planCounts,     setPlanCounts]     = useState({ proMonthly: 0, proAnnual: 0, free: 0 })

  // Uptime ticker
  useEffect(() => {
    if (platformStartMs === null) return
    const tick = () => setUptime(formatUptime(Math.floor((Date.now() - platformStartMs) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [platformStartMs])

  useEffect(() => {
    const fetchAll = async () => {
      // Platform start
      const { data: firstUser } = await supabase
        .from('users').select('created_at').order('created_at', { ascending: true }).limit(1).single()
      if (firstUser?.created_at) setPlatformStartMs(new Date(firstUser.created_at).getTime())

      // Transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*, users(username)')
        .order('created_at', { ascending: false })
        .limit(100)
      const allTxns = txns || []
      setTransactions(allTxns)

      // Stats
      const now       = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const paid       = allTxns.filter((t) => (t.status || '').toLowerCase() === 'paid')
      const paidThisMo = paid.filter((t) => new Date(t.created_at) >= thisMonth)
      const paidLastMo = paid.filter((t) => new Date(t.created_at) >= lastMonth && new Date(t.created_at) < thisMonth)
      const failed     = allTxns.filter((t) => (t.status || '').toLowerCase() === 'failed')
      const activeSubs = allTxns.filter((t) => (t.status || '').toLowerCase() === 'paid' && t.plan && !t.plan.toLowerCase().includes('free'))

      const mrr     = paidThisMo.reduce((s, t) => s + (t.amount || 0), 0)
      const mrrLast = paidLastMo.reduce((s, t) => s + (t.amount || 0), 0)
      const total   = paid.reduce((s, t) => s + (t.amount || 0), 0)
      const mrrChg  = mrrLast > 0 ? Math.round(((mrr - mrrLast) / mrrLast) * 100) : 0

      setStats({ mrr, mrrChange: mrrChg, totalRevenue: total, activeSubs: activeSubs.length, failedPayments: failed.length })

      // Revenue by month — last 8
      const months: { month: string; amount: number }[] = []
      for (let i = 7; i >= 0; i--) {
        const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        const label = d.toLocaleString('default', { month: 'short' })
        const amt   = paid.filter((t) => new Date(t.created_at) >= start && new Date(t.created_at) < end)
                          .reduce((s, t) => s + (t.amount || 0), 0)
        months.push({ month: label, amount: amt })
      }
      setRevenueByMonth(months)

      // Plan distribution from users table
      const { data: usersData } = await supabase.from('users').select('plan').limit(5000)
      const plans = (usersData || []).map((u: any) => (u.plan || 'free').toLowerCase())
      setPlanCounts({
        proMonthly: plans.filter((p) => p.includes('monthly')).length,
        proAnnual:  plans.filter((p) => p.includes('annual')).length,
        free:       plans.filter((p) => !p.includes('pro')).length,
      })
    }
    fetchAll()
  }, [])

  const totalPlanUsers = planCounts.proMonthly + planCounts.proAnnual + planCounts.free

  return (
    <div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-white text-[22px] font-bold tracking-tight leading-tight">
            Payment <span className="text-blue-400">Dashboard</span>
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Revenue overview, transaction log, and manual payment actions.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            <span className="text-blue-400 text-xs font-medium">Platform active</span>
          </div>
          <p className="text-white/30 text-xs">
            Total Uptime:{' '}
            <span className="text-white/55 font-mono tracking-tight">{uptime}</span>
          </p>
        </div>
      </div>

      {/* ── 4 Stat cards — no borders, pure dark bg ──────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">

        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5">
          <p className="text-white text-[36px] font-bold tracking-tight leading-none mb-2">
            ${stats.mrr.toLocaleString()}
          </p>
          <p className="text-blue-400 text-[13px] font-semibold mb-2">MRR</p>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 text-xs font-semibold">▲ {Math.abs(stats.mrrChange)}%</span>
            <span className="text-white/30 text-[11px]">vs Last Month</span>
          </div>
        </div>

        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5">
          <p className="text-white text-[36px] font-bold tracking-tight leading-none mb-2">
            ${stats.totalRevenue.toLocaleString()}
          </p>
          <p className="text-blue-400 text-[13px] font-semibold mb-2">Total Revenue</p>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 text-xs font-semibold">▲ 0%</span>
            <span className="text-white/30 text-[11px]">All time</span>
          </div>
        </div>

        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5">
          <p className="text-white text-[36px] font-bold tracking-tight leading-none mb-2">
            {stats.activeSubs.toLocaleString()}
          </p>
          <p className="text-blue-400 text-[13px] font-semibold mb-2">Active Subscription</p>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 text-xs font-semibold">▲ 0%</span>
            <span className="text-white/30 text-[11px]">All time</span>
          </div>
        </div>

        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5">
          <p className="text-white text-[36px] font-bold tracking-tight leading-none mb-2">
            {stats.failedPayments}
          </p>
          <p className="text-blue-400 text-[13px] font-semibold mb-2">Failed Payment</p>
          <p className="text-white/30 text-[11px]">Needs attention</p>
        </div>
      </div>

      {/* ── Middle row — chart (no card) + plan bars (no card) ───────────────── */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Revenue chart — dark bg, no border */}
        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5">
          <p className="text-white/55 text-[13px] font-medium mb-5">Revenue (Last 8 Months)</p>
          <RevenueBarChart data={revenueByMonth} />
        </div>

        {/* Plan distribution — NO card, just the bars on the same dark bg */}
        <div className="bg-[#0d0d12] rounded-2xl px-6 py-5 flex flex-col justify-center gap-4">
          <PlanBar
            label="PRO MONTHLY"
            count={planCounts.proMonthly}
            total={totalPlanUsers}
            bg="#2563eb"
            textColor="text-white"
          />
          <PlanBar
            label="PRO ANNUAL"
            count={planCounts.proAnnual}
            total={totalPlanUsers}
            bg="#92400e"
            textColor="text-yellow-100"
          />
          <PlanBar
            label="FREE"
            count={planCounts.free}
            total={totalPlanUsers}
            bg="#15803d"
            textColor="text-white"
          />
        </div>
      </div>

      {/* ── Transaction table ─────────────────────────────────────────────────── */}
      <div className="bg-[#0d0d12] rounded-2xl overflow-hidden">

        {/* Header row */}
        <div
          className="grid bg-[#0d1529]"
          style={{ gridTemplateColumns: '1.8fr 1.5fr 1.4fr 1fr 1fr' }}
        >
          {['txn_ID', 'User', 'Plan', 'Amount', 'Status'].map((col) => (
            <div key={col} className="px-6 py-4">
              <span className="text-white/70 text-[12px] font-semibold">{col}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-white/25 text-sm">No transactions yet.</p>
          </div>
        ) : (
          transactions.map((txn, idx) => (
            <div
              key={txn.id ?? idx}
              className="grid border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              style={{ gridTemplateColumns: '1.8fr 1.5fr 1.4fr 1fr 1fr' }}
            >
              <div className="px-6 py-4">
                <span className="text-white/45 text-[12px] font-mono">
                  {(txn.id || '').toString().slice(0, 14)}
                </span>
              </div>
              <div className="px-6 py-4">
                <span className="text-white/75 text-[13px]">
                  @{txn.users?.username ?? txn.user_id ?? '—'}
                </span>
              </div>
              <div className="px-6 py-4">
                <PlanPill plan={txn.plan ?? ''} />
              </div>
              <div className="px-6 py-4">
                <AmountCell amount={txn.amount} status={txn.status ?? ''} />
              </div>
              <div className="px-6 py-4">
                <StatusBadge status={txn.status ?? ''} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}