// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/onboarding', '/signin']

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Always allow static assets, API routes, and ALL admin routes
  // Admin pages handle their own auth via client-side checks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.match(/\.(ico|png|svg|jpg|jpeg|webp|gif|woff|woff2)$/)
  ) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name)           { return req.cookies.get(name)?.value },
        set(name, value, o) { res.cookies.set({ name, value, ...o }) },
        remove(name, o)     { res.cookies.set({ name, value: '', ...o }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Public user routes — no auth needed
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    /^\/@?[a-zA-Z0-9_]+$/.test(pathname) // public profile pages

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}