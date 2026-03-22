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
        id: supabaseUserId, email,
        wallet_address: walletAddress,
        profile_strength: 0, plan: 'free',
        created_at: new Date().toISOString(),
      })
    }

    if (walletAddress) {
      await supabaseAdmin.from('users')
        .update({ wallet_address: walletAddress })
        .eq('id', supabaseUserId)
    }

    // 5. Generate magic link and extract OTP token from the URL
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError || !linkData) {
      console.error('generateLink error:', linkError)
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
    }

    // Extract the token from action_link URL
    // action_link looks like: https://xxx.supabase.co/auth/v1/verify?token=XXX&type=magiclink&...
    const actionLink = (linkData as any)?.properties?.action_link
      || (linkData as any)?.action_link
      || ''

    console.log('action_link:', actionLink)

    let otpToken: string | null = null

    if (actionLink) {
      try {
        const url = new URL(actionLink)
        otpToken = url.searchParams.get('token')
      } catch (e) {
        console.error('Failed to parse action_link URL:', e)
      }
    }

    // Also try hashed_token directly
    const hashedToken = (linkData as any)?.properties?.hashed_token
      || (linkData as any)?.hashed_token

    const tokenToReturn = otpToken || hashedToken

    if (!tokenToReturn) {
      console.error('No token found. linkData:', JSON.stringify(linkData))
      return NextResponse.json({ error: 'Failed to extract token' }, { status: 500 })
    }

    // Return email + token — client will call verifyOtp to get session
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