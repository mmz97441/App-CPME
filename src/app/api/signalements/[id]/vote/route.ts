import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSeverityScore } from "@/utils/scoring";
import {
  getAuthenticatedSession,
  checkPermission,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    if (!checkPermission(session.user.role, "signalement:vote")) {
      return errorResponse("Accès refusé", 403);
    }

    const signalementId = params.id;

    const signalement = await prisma.signalement.findUnique({
      where: { id: signalementId },
    });

    if (!signalement) {
      return errorResponse("Signalement non trouvé", 404);
    }

    // Check if already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_signalementId: {
          userId: session.user.id,
          signalementId,
        },
      },
    });

    if (existingVote) {
      // Remove vote (toggle)
      await prisma.vote.delete({ where: { id: existingVote.id } });

      const newVotesCount = signalement.votesCount - 1;
      const newSeverityScore = calculateSeverityScore({
        estimatedTimeLoss: signalement.estimatedTimeLoss,
        estimatedCost: signalement.estimatedCost,
        votesCount: newVotesCount,
      });

      const updated = await prisma.signalement.update({
        where: { id: signalementId },
        data: {
          votesCount: newVotesCount,
          severityScore: newSeverityScore,
        },
      });

      return successResponse({ ...updated, voted: false });
    }

    // Add vote
    await prisma.vote.create({
      data: {
        userId: session.user.id,
        signalementId,
      },
    });

    const newVotesCount = signalement.votesCount + 1;
    const newSeverityScore = calculateSeverityScore({
      estimatedTimeLoss: signalement.estimatedTimeLoss,
      estimatedCost: signalement.estimatedCost,
      votesCount: newVotesCount,
    });

    const updated = await prisma.signalement.update({
      where: { id: signalementId },
      data: {
        votesCount: newVotesCount,
        severityScore: newSeverityScore,
      },
    });

    return successResponse({ ...updated, voted: true });
  } catch (error) {
    console.error("Vote error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
