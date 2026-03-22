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

    // 1. Verify Privy token — get claims
    let claims: any
    try {
      claims = await privy.verifyAuthToken(accessToken)
      console.log('Privy claims:', JSON.stringify(claims))
    } catch (err) {
      console.error('Privy token verification failed:', err)
      return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 })
    }

    // 2. Try to get user — but fall back to claims if it fails
    let privyUser: any = null
    const userId = claims.userId || claims.sub || claims.appId
    console.log('Privy userId from claims:', userId)

    try {
      // Try with userId as-is first
      privyUser = await privy.getUser(userId)
    } catch (err1) {
      console.log('getUser failed with raw userId, trying with did:privy: prefix stripped')
      try {
        // Try stripping the did:privy: prefix if present
        const strippedId = userId?.replace('did:privy:', '')
        privyUser = await privy.getUser(strippedId)
      } catch (err2) {
        console.log('getUser also failed stripped — extracting from claims directly')
        // Fall through — we'll extract from claims
      }
    }

    // 3. Extract identity from user OR fall back to claims
    let email: string | null = null
    let walletAddress: string | null = null

    if (privyUser) {
      const linkedAccounts = privyUser?.linkedAccounts || []
      console.log('Linked accounts:', JSON.stringify(linkedAccounts))

      const emailAccount  = linkedAccounts.find((a: any) => a.type === 'email' || a.type === 'google_oauth')
      const walletAccount = linkedAccounts.find((a: any) => a.type === 'wallet')

      email         = emailAccount?.address || null
      walletAddress = walletAccount?.address || null
    }

    // Fall back — try to get email from claims directly
    if (!email) {
      email = claims.email
        || claims.user?.email
        || (claims.wallet ? `${claims.wallet.toLowerCase()}@candoxa.wallet` : null)
        || (userId ? `${userId.replace('did:privy:', '').toLowerCase()}@candoxa.wallet` : null)
      walletAddress = walletAddress || claims.wallet || null
    }

    console.log('Resolved email:', email, 'wallet:', walletAddress)

    if (!email) {
      return NextResponse.json({ error: 'Could not extract identity from Privy token' }, { status: 400 })
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
        console.error('Failed to create Supabase user:', createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      supabaseUserId = newUser.user.id

      await supabaseAdmin.from('users').insert({
        id:               supabaseUserId,
        email,
        wallet_address:   walletAddress,
        profile_strength: 0,
        plan:             'free',
        created_at:       new Date().toISOString(),
      })
    }

    if (walletAddress) {
      await supabaseAdmin.from('users')
        .update({ wallet_address: walletAddress })
        .eq('id', supabaseUserId)
    }

    // 5. Generate Supabase session
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type:    'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://candoxa.vercel.app'}/onboarding?step=3`,
      },
    })

    if (linkError || !linkData) {
      console.error('Failed to generate link:', linkError)
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
    }

    const properties         = (linkData as any).properties
    const accessTokenResult  = properties?.access_token
    const refreshTokenResult = properties?.refresh_token

    if (!accessTokenResult || !refreshTokenResult) {
      return NextResponse.json({ error: 'Failed to extract session tokens' }, { status: 500 })
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