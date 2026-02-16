import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { healthSchema, paginationSchema } from "@/utils/validation";
import { calculateHealthScore } from "@/utils/scoring";
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

    if (!checkPermission(session.user.role, "health:create")) {
      return errorResponse("Accès refusé", 403);
    }

    const body = await req.json();
    const parsed = healthSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = parsed.data;
    const healthResult = calculateHealthScore(data);

    const assessment = await prisma.healthAssessment.create({
      data: {
        userId: session.user.id,
        fatigueMentale: data.fatigueMentale,
        chargeEmotionnelle: data.chargeEmotionnelle,
        isolement: data.isolement,
        difficulteDecisionnelle: data.difficulteDecisionnelle,
        score: healthResult.score,
      },
    });

    return successResponse(
      {
        assessment,
        isAlert: healthResult.isAlert,
        recommendations: healthResult.recommendations,
      },
      201
    );
  } catch (error) {
    console.error("Health assessment creation error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    if (!checkPermission(session.user.role, "health:read")) {
      return errorResponse("Accès refusé", 403);
    }

    const { searchParams } = new URL(req.url);
    const pagination = paginationSchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });

    const [assessments, total] = await Promise.all([
      prisma.healthAssessment.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.healthAssessment.count({
        where: { userId: session.user.id },
      }),
    ]);

    return paginatedResponse(
      assessments,
      total,
      pagination.page,
      pagination.pageSize
    );
  } catch (error) {
    console.error("Health assessment fetch error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
