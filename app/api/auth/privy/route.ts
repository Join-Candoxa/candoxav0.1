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
        console.error('Failed to create user:', createError)
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

    // 5. Generate magic link — get hashed_token for verifyOtp
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type:  'magiclink',
      email,
    })

    if (linkError || !linkData) {
      console.error('generateLink error:', linkError)
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
    }

    const properties  = (linkData as any)?.properties
    const hashedToken = properties?.hashed_token
    const actionLink  = properties?.action_link || ''

    let tokenToReturn = hashedToken

    // Fall back: extract token from action_link URL
    if (!tokenToReturn && actionLink) {
      try {
        const url = new URL(actionLink)
        tokenToReturn = url.searchParams.get('token')
      } catch (e) {
        console.error('Failed to parse action_link:', e)
      }
    }

    console.log('hashed_token:', !!hashedToken, 'action_link token:', !!tokenToReturn)

    if (!tokenToReturn) {
      console.error('No token found. linkData:', JSON.stringify(linkData))
      return NextResponse.json({ error: 'Failed to extract token' }, { status: 500 })
    }

    return NextResponse.json({
      email,
      token:          tokenToReturn,
      wallet_address: walletAddress,
    })

  } catch (err) {
    console.error('Privy auth route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}