import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewElectoralList } from "@/types/rbac";

// =============================================================================
// GET /api/electoral/export - Export electoral list as JSON for PDF generation
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    if (!canViewElectoralList(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const currentYear = new Date().getFullYear();

    const adherents = await prisma.adherent.findMany({
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        cotisations: {
          where: { year: currentYear },
          take: 1,
        },
      },
      orderBy: { companyName: "asc" },
    });

    const electoralList = adherents.map((adherent) => {
      const currentCotisation = adherent.cotisations[0] ?? null;
      const cotisationStatus = currentCotisation?.status ?? "AUCUNE";
      const canVote =
        adherent.isActive === true &&
        currentCotisation !== null &&
        currentCotisation.status === "PAID";

      return {
        companyName: adherent.companyName,
        userName: adherent.user.name || "-",
        email: adherent.user.email,
        secteur: adherent.secteur,
        type: adherent.type,
        memberSince: adherent.memberSince,
        cotisationStatus,
        canVote,
      };
    });

    const eligible = electoralList.filter((e) => e.canVote);
    const ineligible = electoralList.filter((e) => !e.canVote);

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        year: currentYear,
        total: electoralList.length,
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
        entries: electoralList,
      },
    });
  } catch (error) {
    console.error("Error exporting electoral list:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
