import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle 404 redirects for old URLs found in Google Search Console
  const redirects: Record<string, string> = {
    '/download': '/',
    '/download/': '/',
    '/Web': '/',
  }

  // Check if current path needs redirection
  if (redirects[pathname]) {
    return NextResponse.redirect(new URL(redirects[pathname], request.url), 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match specific problematic paths to avoid interfering with existing routing
    '/download/:path*',
    '/Web',
  ],
}
