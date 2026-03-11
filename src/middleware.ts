import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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
    "/adherents/:path*",
    "/cotisations/:path*",
    "/electoral/:path*",
    "/gouvernance/:path*",
    "/mandats/:path*",
    "/tickets/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/api/adherents/:path*",
    "/api/cotisations/:path*",
    "/api/electoral/:path*",
    "/api/admin/:path*",
    "/api/dashboard/:path*",
  ],
};
