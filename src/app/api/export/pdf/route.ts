import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedSession,
  checkPermission,
  errorResponse,
} from "@/lib/api-utils";
import { generateDiagnosticPDF } from "@/services/pdfService";
import type { ComplexityScore } from "@/types";
import { calculateComplexityScore } from "@/utils/scoring";
import type { DiagnosticInput } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    if (!checkPermission(session.user.role, "export:pdf")) {
      return errorResponse("Accès refusé", 403);
    }

    const { searchParams } = new URL(req.url);
    const diagnosticId = searchParams.get("diagnosticId");

    if (!diagnosticId) {
      return errorResponse("ID du diagnostic requis", 400);
    }

    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id: diagnosticId },
      include: {
        company: true,
        user: { select: { id: true } },
      },
    });

    if (!diagnostic) {
      return errorResponse("Diagnostic non trouvé", 404);
    }

    // Check ownership or admin access
    const canReadAll = checkPermission(session.user.role, "diagnostic:read:all");
    if (!canReadAll && diagnostic.userId !== session.user.id) {
      return errorResponse("Accès refusé", 403);
    }

    const rawAnswers = diagnostic.rawAnswers as unknown as DiagnosticInput;
    const score: ComplexityScore = calculateComplexityScore(rawAnswers);

    const doc = generateDiagnosticPDF({
      companyName: diagnostic.company.name,
      sector: diagnostic.company.sector,
      region: diagnostic.company.region,
      date: diagnostic.createdAt.toLocaleDateString("fr-FR"),
      score,
      rawAnswers: diagnostic.rawAnswers as Record<string, unknown>,
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="diagnostic-${diagnosticId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
