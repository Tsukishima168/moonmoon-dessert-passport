import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Stable QR router: QR domain stays the same; target base can change via env.
const BASE = process.env.QR_TARGET_BASE_URL || 'https://moonmoon-dessert-passport.vercel.app';

const unlockMap: Record<string, string> = {
  secret: 'secret_spot',
  observer: 'observer',
  share: 'dessert_connect',
  first: 'first_visit',
};

export function middleware(req: NextRequest) {
  const url = new URL(req.url);

  if (!url.pathname.startsWith('/qr/')) return NextResponse.next();

  const key = url.pathname.replace('/qr/', '').replace(/\/$/, '');
  const unlockParam = unlockMap[key];

  if (!unlockParam) {
    return NextResponse.rewrite(`${BASE}/404`);
  }

  const target = `${BASE}/?unlock=${unlockParam}`;
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ['/qr/:path*'],
};
