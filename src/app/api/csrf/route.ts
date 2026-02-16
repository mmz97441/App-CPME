import { NextResponse } from "next/server";
import { getCsrfToken } from "@/lib/csrf";

/**
 * GET /api/csrf
 * Returns a CSRF token for the client to include in mutation requests.
 */
export async function GET() {
  const token = await getCsrfToken();
  return NextResponse.json({ csrfToken: token });
}
