import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signalementSchema, paginationSchema } from "@/utils/validation";
import { calculateSeverityScore } from "@/utils/scoring";
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

    if (!checkPermission(session.user.role, "signalement:create")) {
      return errorResponse("Accès refusé", 403);
    }

    const body = await req.json();
    const parsed = signalementSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = parsed.data;

    const severityScore = calculateSeverityScore({
      estimatedTimeLoss: data.estimatedTimeLoss,
      estimatedCost: data.estimatedCost,
      votesCount: 0,
    });

    const signalement = await prisma.signalement.create({
      data: {
        userId: session.user.id,
        title: data.title,
        description: data.description,
        estimatedTimeLoss: data.estimatedTimeLoss,
        estimatedCost: data.estimatedCost,
        level: data.level,
        sector: data.sector,
        severityScore,
      },
    });

    return successResponse(signalement, 201);
  } catch (error) {
    console.error("Signalement creation error:", error);
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

    const sector = searchParams.get("sector");
    const level = searchParams.get("level");
    const sortBy = searchParams.get("sortBy") || "severityScore";

    const canReadAll = checkPermission(
      session.user.role,
      "signalement:read:all"
    );
    const where: Record<string, unknown> = canReadAll
      ? {}
      : { userId: session.user.id };

    if (sector) where.sector = sector;
    if (level) where.level = level;

    const orderBy: Record<string, string> = {};
    if (sortBy === "severityScore") orderBy.severityScore = "desc";
    else if (sortBy === "votesCount") orderBy.votesCount = "desc";
    else if (sortBy === "createdAt") orderBy.createdAt = "desc";
    else orderBy.severityScore = "desc";

    const [signalements, total] = await Promise.all([
      prisma.signalement.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          user: { select: { name: true } },
          _count: { select: { votes: true } },
        },
      }),
      prisma.signalement.count({ where }),
    ]);

    return paginatedResponse(
      signalements,
      total,
      pagination.page,
      pagination.pageSize
    );
  } catch (error) {
    console.error("Signalement fetch error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
