import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewElectoralList } from "@/types/rbac";

// =============================================================================
// GET /api/electoral - Electoral list with voting eligibility
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autoris\u00e9" },
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
          select: {
            id: true,
            email: true,
            name: true,
          },
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
        id: adherent.id,
        companyName: adherent.companyName,
        userName: adherent.user.name,
        email: adherent.user.email,
        secteur: adherent.secteur,
        type: adherent.type,
        memberSince: adherent.memberSince,
        cotisationStatus,
        canVote,
      };
    });

    return NextResponse.json({ success: true, data: electoralList });
  } catch (error) {
    console.error("Error fetching electoral list:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
