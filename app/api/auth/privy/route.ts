// app/api/auth/privy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createClient } from '@supabase/supabase-js'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 400 })
    }

    // 1. Verify Privy token
    let claims: any
    try {
      claims = await privy.verifyAuthToken(accessToken)
    } catch (err) {
      console.error('Privy token verification failed:', err)
      return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 })
    }

    // 2. Try to get full Privy user
    let privyUser: any = null
    const userId = claims.userId || claims.sub
    try {
      privyUser = await privy.getUser(userId)
    } catch {
      try {
        privyUser = await privy.getUser(userId?.replace('did:privy:', ''))
      } catch {
        console.log('Could not fetch Privy user, using claims only')
      }
    }

    // 3. Extract identity
    let email: string | null = null
    let walletAddress: string | null = null

    if (privyUser) {
      const linked    = privyUser?.linkedAccounts || []
      const emailAcc  = linked.find((a: any) => a.type === 'email' || a.type === 'google_oauth')
      const walletAcc = linked.find((a: any) => a.type === 'wallet')
      email         = emailAcc?.address || null
      walletAddress = walletAcc?.address || null
    }

    if (!email) {
      email = claims.email
        || (claims.wallet ? `${claims.wallet.toLowerCase()}@candoxa.wallet` : null)
        || `${(userId || 'user').replace('did:privy:', '').toLowerCase().slice(0, 20)}@candoxa.wallet`
      walletAddress = walletAddress || claims.wallet || null
    }

    if (!email) {
      return NextResponse.json({ error: 'Could not extract identity' }, { status: 400 })
    }

    // 4. Find or create Supabase user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email)
    let supabaseUserId: string

    if (existingUser) {
      supabaseUserId = existingUser.id
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { wallet_address: walletAddress, privy_id: userId },
      })
      if (createError || !newUser?.user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
      supabaseUserId = newUser.user.id
      await supabaseAdmin.from('users').insert({
        id: supabaseUserId, email,
        wallet_address: walletAddress,
        profile_strength: 0, plan: 'free',
        created_at: new Date().toISOString(),
      })
    }

    if (walletAddress) {
      await supabaseAdmin.from('users').update({ wallet_address: walletAddress }).eq('id', supabaseUserId)
    }

    // 5. Generate session link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://candoxa.vercel.app'}/onboarding?step=3`,
      },
    })

    if (linkError || !linkData) {
      console.error('generateLink error:', linkError)
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
    }

    // Log full structure so we can debug
    console.log('linkData full:', JSON.stringify(linkData, null, 2))

    // Supabase v2 returns tokens inside properties
    const properties         = (linkData as any)?.properties
    const accessTokenResult  = properties?.access_token
    const refreshTokenResult = properties?.refresh_token

    if (!accessTokenResult || !refreshTokenResult) {
      console.error('Token extraction failed. linkData structure:', JSON.stringify(linkData))
      return NextResponse.json({
        error: 'Failed to extract session tokens',
        debug: JSON.stringify(Object.keys(linkData)),
      }, { status: 500 })
    }

    return NextResponse.json({
      access_token:   accessTokenResult,
      refresh_token:  refreshTokenResult,
      email,
      wallet_address: walletAddress,
    })

  } catch (err) {
    console.error('Privy auth route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}