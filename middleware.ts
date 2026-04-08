// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Privy manages authentication entirely client-side.
// Server-side session checks via supabase.auth.getSession() always return null
// for Privy users because Privy doesn't store tokens in cookies the server can read.
// All auth redirects are handled in each page's useEffect instead.
// This middleware only handles static asset passthrough.

export async function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}