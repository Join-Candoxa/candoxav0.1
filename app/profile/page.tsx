// app/profile/page.tsx — Public profile page
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ensureUserProfile } from '@/lib/supabase'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ProfilePage from '@/components/profile/ProfilePage'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/onboarding'); return }
      await ensureUserProfile(session.user)
      setUser(session.user)
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  )

  return (
    <DashboardLayout user={user}>
      <ProfilePage user={user} />
    </DashboardLayout>
  )
}