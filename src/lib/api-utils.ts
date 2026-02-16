import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { hasPermission, type Permission } from "@/types";
import type { Role } from "@prisma/client";

/**
 * Get the current authenticated session or return a 401 response.
 */
export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return session;
}

/**
 * Check if the current user has the required permission.
 * Returns a 403 response if not authorized.
 */
export function checkPermission(
  role: Role,
  permission: Permission
): boolean {
  return hasPermission(role, permission);
}

/**
 * Standard error response helper.
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Standard success response helper.
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Paginated response helper.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
