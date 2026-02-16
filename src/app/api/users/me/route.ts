import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { companySchema } from "@/utils/validation";
import {
  getAuthenticatedSession,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        gdprConsent: true,
        createdAt: true,
        company: true,
      },
    });

    return successResponse(user);
  } catch (error) {
    console.error("User fetch error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    const body = await req.json();
    const parsed = companySchema.safeParse(body.company);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const companyData = parsed.data;

    const company = await prisma.company.upsert({
      where: { userId: session.user.id },
      update: companyData,
      create: {
        ...companyData,
        userId: session.user.id,
      },
    });

    return successResponse(company);
  } catch (error) {
    console.error("User update error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
