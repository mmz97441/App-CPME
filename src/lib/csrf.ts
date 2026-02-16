import { randomBytes, createHmac } from "crypto";
import { cookies } from "next/headers";

const CSRF_SECRET = process.env.NEXTAUTH_SECRET || "csrf-fallback-secret";
const CSRF_COOKIE_NAME = "__csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a CSRF token using HMAC.
 */
export function generateCsrfToken(): string {
  const nonce = randomBytes(32).toString("hex");
  const hmac = createHmac("sha256", CSRF_SECRET).update(nonce).digest("hex");
  return `${nonce}.${hmac}`;
}

/**
 * Validate a CSRF token.
 */
export function validateCsrfToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [nonce, providedHmac] = parts;
  const expectedHmac = createHmac("sha256", CSRF_SECRET)
    .update(nonce)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (providedHmac.length !== expectedHmac.length) return false;

  let result = 0;
  for (let i = 0; i < providedHmac.length; i++) {
    result |= providedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get or create a CSRF token for the current request.
 * Sets it as an httpOnly cookie and returns it for the client.
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existing && validateCsrfToken(existing)) {
    return existing;
  }

  const token = generateCsrfToken();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return token;
}

/**
 * Verify CSRF token from request header against cookie.
 */
export async function verifyCsrfToken(
  headerToken: string | null
): Promise<boolean> {
  if (!headerToken) return false;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) return false;

  return (
    headerToken === cookieToken &&
    validateCsrfToken(headerToken)
  );
}

export { CSRF_HEADER_NAME };
