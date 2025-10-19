import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // DEMO MODE: Bypass all authentication for testing
  console.log('🚀 DEMO MODE: Bypassing authentication for all routes');
  
  // Auth routes should redirect to designer in demo mode
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);
  
  if (isAuthRoute) {
    console.log('Redirecting auth route to designer in demo mode');
    return NextResponse.redirect(new URL('/designer', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};