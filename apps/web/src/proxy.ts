import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast UX redirect only — NOT the security boundary. The API authorises
 * every request itself; this just avoids flashing private pages to visitors
 * who obviously have no session cookie.
 */
const COOKIES = ['__Host-fitcv_session', 'fitcv_session'];

export function proxy(req: NextRequest) {
  const hasSession = COOKIES.some((c) => req.cookies.has(c));
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/app') && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (pathname === '/login' && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/login'] };
