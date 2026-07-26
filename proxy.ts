import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, isValidAdminAuth } from '@/lib/adminAuth';

/**
 * Proxy (ex-middleware) : protège /admin par Basic Auth.
 * Identifiants attendus dans ADMIN_USER / ADMIN_PASS (voir .env.example).
 * Couvre aussi les Server Actions déclenchées depuis la page (elles POSTent
 * sur l'URL /admin, donc passent par ce matcher).
 */
export function proxy(request: NextRequest) {
  if (!isAdminConfigured()) {
    return new NextResponse('Admin credentials are not configured on this server.', {
      status: 503,
    });
  }

  if (isValidAdminAuth(request.headers.get('authorization'))) {
    return NextResponse.next();
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Tykwriter Admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
