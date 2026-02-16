import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedSession,
  errorResponse,
} from "@/lib/api-utils";
import { anonymizeUserData } from "@/middleware/gdpr";
import { logAuditAction } from "@/middleware/gdpr";

/**
 * GET /api/users/me/export
 * GDPR Article 20 - Right to data portability.
 * Returns all user data in anonymized JSON format.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    const { searchParams } = new URL(req.url);
    const anonymize = searchParams.get("anonymize") !== "false";

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        gdprConsent: true,
        gdprConsentAt: true,
        createdAt: true,
        company: true,
        diagnostics: {
          select: {
            id: true,
            complexityScore: true,
            fiscalScore: true,
            socialScore: true,
            adminScore: true,
            rawAnswers: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        signalements: {
          select: {
            id: true,
            title: true,
            description: true,
            estimatedTimeLoss: true,
            estimatedCost: true,
            level: true,
            sector: true,
            severityScore: true,
            votesCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        healthAssessments: {
          select: {
            id: true,
            fatigueMentale: true,
            chargeEmotionnelle: true,
            isolement: true,
            difficulteDecisionnelle: true,
            score: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        votes: {
          select: {
            signalementId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("Utilisateur non trouvé", 404);
    }

    // Log this export action for GDPR audit trail
    await logAuditAction(
      session.user.id,
      "DATA_EXPORT",
      `Export complet des données personnelles (anonymisé: ${anonymize})`,
      req.headers.get("x-forwarded-for") || undefined
    );

    // Prepare export data
    let exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      exportType: "RGPD - Portabilité des données (Article 20)",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gdprConsent: user.gdprConsent,
        gdprConsentAt: user.gdprConsentAt,
        createdAt: user.createdAt,
      },
      company: user.company,
      diagnostics: user.diagnostics,
      signalements: user.signalements,
      healthAssessments: user.healthAssessments,
      votes: user.votes,
      metadata: {
        totalDiagnostics: user.diagnostics.length,
        totalSignalements: user.signalements.length,
        totalHealthAssessments: user.healthAssessments.length,
        totalVotes: user.votes.length,
      },
    };

    // Anonymize if requested
    if (anonymize) {
      exportData = anonymizeUserData(exportData) as Record<string, unknown>;
      // Also anonymize nested user fields
      if (exportData.user && typeof exportData.user === "object") {
        exportData.user = anonymizeUserData(
          exportData.user as Record<string, unknown>
        );
      }
    }

    const jsonString = JSON.stringify(exportData, null, 2);

    return new Response(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="export-donnees-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
