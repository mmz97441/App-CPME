import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Add security headers
    const response = NextResponse.next();

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/diagnostic/:path*",
    "/signalements/:path*",
    "/observatory/:path*",
    "/health/:path*",
    "/admin/:path*",
    "/api/diagnostics/:path*",
    "/api/signalements/:path*",
    "/api/health-assessments/:path*",
    "/api/observatory/:path*",
    "/api/users/:path*",
    "/api/export/:path*",
    "/api/ai/:path*",
  ],
};
