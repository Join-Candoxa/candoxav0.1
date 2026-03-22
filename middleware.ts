// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that never require auth
const PUBLIC_ROUTES   = ['/', '/onboarding', '/signin']
// Admin login pages — public
const ADMIN_PUBLIC    = ['/admin', '/admin/reset', '/admin/reset/confirm']

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Always allow static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|gif|woff|woff2)$/)
  ) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name)            { return req.cookies.get(name)?.value },
        set(name, value, o)  { res.cookies.set({ name, value, ...o }) },
        remove(name, o)      { res.cookies.set({ name, value: '', ...o }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // ── Admin routes ───────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Admin login pages are always public
    if (ADMIN_PUBLIC.includes(pathname)) return res
    // All other /admin/* routes require a session
    if (!session) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return res
  }

  // ── User routes ────────────────────────────────────────────────────────────
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    /^\/@?[a-zA-Z0-9_]+$/.test(pathname) // public profile pages e.g. /username

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}