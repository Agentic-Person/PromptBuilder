import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Database } from '@/types/database';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient<Database>({ req, res });

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedRoutes = ['/designer', '/dashboard', '/settings', '/workflows'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // Auth routes that should redirect if already logged in
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);

  // If user is not authenticated and trying to access protected route
  if (!session && isProtectedRoute) {
    // Temporarily allow access to designer for debugging
    if (req.nextUrl.pathname === '/designer') {
      console.log('Allowing unauthenticated access to /designer for debugging');
      return res;
    }
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access auth routes
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/designer', req.url));
  }

  // For protected routes, check if user record exists
  if (session && isProtectedRoute && req.nextUrl.pathname !== '/designer') {
    const { data: user } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('id', session.user.id)
      .single();

    // If user record doesn't exist, redirect to complete setup
    if (!user || !user.org_id) {
      return NextResponse.redirect(new URL('/setup', req.url));
    }
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