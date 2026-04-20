import { NextRequest, NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'devfeaso2024'
const COOKIE_NAME = 'site_auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow password page, admin, and all API routes through
  if (pathname === '/password' || pathname.startsWith('/api/') || pathname.startsWith('/admin/')) {
    return NextResponse.next()
  }

  // Check for valid auth cookie
  const cookie = request.cookies.get(COOKIE_NAME)
  if (cookie?.value === SITE_PASSWORD) {
    return NextResponse.next()
  }

  // Redirect to password page
  const url = request.nextUrl.clone()
  url.pathname = '/password'
  url.searchParams.set('from', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
