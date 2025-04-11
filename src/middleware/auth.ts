import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import shopify from '../shopify.config';

export async function middleware(request: NextRequest) {
  const session = await shopify.session.getCurrentId({
    isOnline: true,
    rawRequest: request,
  });

  if (!session) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
}; 