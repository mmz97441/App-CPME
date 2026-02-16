import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedSession,
  checkPermission,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import {
  classifySignalement,
  summarizeDescription,
  detectDuplicates,
  generateParliamentarySynthesis,
} from "@/services/aiService";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "classify": {
        if (!checkPermission(session.user.role, "signalement:create")) {
          return errorResponse("Accès refusé", 403);
        }
        const { title, description } = body;
        const category = await classifySignalement(title, description);
        return successResponse({ category });
      }

      case "summarize": {
        if (!checkPermission(session.user.role, "signalement:read")) {
          return errorResponse("Accès refusé", 403);
        }
        const { description: desc } = body;
        const summary = await summarizeDescription(desc);
        return successResponse({ summary });
      }

      case "detect-duplicates": {
        if (!checkPermission(session.user.role, "signalement:create")) {
          return errorResponse("Accès refusé", 403);
        }
        const { title: t, description: d } = body;
        const existing = await prisma.signalement.findMany({
          select: { id: true, title: true, description: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        const duplicateIds = await detectDuplicates(t, d, existing);
        return successResponse({ duplicateIds });
      }

      case "synthesis": {
        if (!checkPermission(session.user.role, "observatory:read")) {
          return errorResponse("Accès refusé", 403);
        }

        const avgScore = await prisma.diagnostic.aggregate({
          _avg: { complexityScore: true },
          _count: true,
        });

        const topIrritants = await prisma.signalement.findMany({
          orderBy: { severityScore: "desc" },
          take: 10,
          select: {
            title: true,
            severityScore: true,
            votesCount: true,
          },
        });

        const sectorDiagnostics = await prisma.diagnostic.findMany({
          select: {
            complexityScore: true,
            company: { select: { sector: true } },
          },
        });

        const sectorAgg: Record<
          string,
          { totalScore: number; count: number }
        > = {};
        for (const diag of sectorDiagnostics) {
          const s = diag.company.sector;
          if (!sectorAgg[s]) sectorAgg[s] = { totalScore: 0, count: 0 };
          sectorAgg[s].totalScore += diag.complexityScore;
          sectorAgg[s].count++;
        }

        const sectorData = Object.entries(sectorAgg).map(([sector, data]) => ({
          sector,
          avgScore: Math.round((data.totalScore / data.count) * 100) / 100,
          count: data.count,
        }));

        const synthesis = await generateParliamentarySynthesis({
          averageScore: avgScore._avg.complexityScore || 0,
          totalDiagnostics: avgScore._count,
          topIrritants,
          sectorData,
        });

        return successResponse({ synthesis });
      }

      default:
        return errorResponse("Action non reconnue", 400);
    }
  } catch (error) {
    console.error("AI action error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
