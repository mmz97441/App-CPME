import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { diagnosticSchema, paginationSchema } from "@/utils/validation";
import { calculateComplexityScore } from "@/utils/scoring";
import {
  getAuthenticatedSession,
  checkPermission,
  errorResponse,
  successResponse,
  paginatedResponse,
} from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    if (!checkPermission(session.user.role, "diagnostic:create")) {
      return errorResponse("Accès refusé", 403);
    }

    const body = await req.json();
    const parsed = diagnosticSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = parsed.data;

    // Check user has a company
    const company = await prisma.company.findUnique({
      where: { userId: session.user.id },
    });

    if (!company) {
      return errorResponse(
        "Vous devez d'abord créer votre profil entreprise",
        400
      );
    }

    const score = calculateComplexityScore(data);

    const diagnostic = await prisma.diagnostic.create({
      data: {
        userId: session.user.id,
        companyId: company.id,
        rawAnswers: data,
        complexityScore: score.global,
        fiscalScore: score.fiscal,
        socialScore: score.social,
        adminScore: score.admin,
      },
    });

    return successResponse({ diagnostic, score }, 201);
  } catch (error) {
    console.error("Diagnostic creation error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    const { searchParams } = new URL(req.url);
    const pagination = paginationSchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });

    const canReadAll = checkPermission(session.user.role, "diagnostic:read:all");
    const where = canReadAll ? {} : { userId: session.user.id };

    const [diagnostics, total] = await Promise.all([
      prisma.diagnostic.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          company: { select: { name: true, sector: true, region: true } },
        },
      }),
      prisma.diagnostic.count({ where }),
    ]);

    return paginatedResponse(
      diagnostics,
      total,
      pagination.page,
      pagination.pageSize
    );
  } catch (error) {
    console.error("Diagnostic fetch error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
