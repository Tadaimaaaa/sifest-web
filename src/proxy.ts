import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rute yang butuh perlindungan login (tidak bisa diakses publik)
const protectedRoutes = ['/dashboard', '/users', '/sponsor', '/surat', '/produk', '/activity', '/settings'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;

  // Cek apakah user sedang mencoba mengakses halaman ber-proteksi
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  // Jika mencoba akses rute terproteksi tapi tidak ada token, tendang ke /login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah punya token tapi mencoba akses /login, redirect ke /dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Hanya jalankan middleware di rute-rute utama ini, kecualikan file statis/api
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon-*|logo.png).*)'],
};
