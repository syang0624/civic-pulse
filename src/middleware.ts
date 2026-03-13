import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Exact segment match to avoid false positives like /dashboard/login-history
  const segments = pathname.split('/').filter(Boolean);
  const routeSegments =
    routing.locales.includes(segments[0] as 'ko' | 'en')
      ? segments.slice(1)
      : segments;
  const isPublicRoute =
    routeSegments[0] === 'login' ||
    routeSegments[0] === 'signup' ||
    routeSegments[0] === 'onboarding' ||
    pathname.startsWith('/api/auth');

  if (!user && !isPublicRoute) {
    const pathLocale = pathname.split('/')[1] ?? '';
    const locale =
      routing.locales.find((l) => l === pathLocale) ?? routing.defaultLocale;

    const redirectUrl = new URL(`/${locale}/login`, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Preserve full cookie attributes when copying
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options);
    });

    return redirectResponse;
  }

  const intlResponse = intlMiddleware(request);

  // Preserve full cookie attributes when copying
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    intlResponse.cookies.set(name, value, options);
  });

  return intlResponse;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
