import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// =============================================================================
// GET /api/dashboard - Dashboard statistics
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

    const currentYear = new Date().getFullYear();

    // Run all queries in parallel for performance
    const [
      totalAdherents,
      adherentsActifs,
      cotisationsPayees,
      cotisationsEnAttente,
      cotisationsEnRetard,
      totalRecettesResult,
      totalCotisationsCurrentYear,
      mandatsActifs,
      ticketsOuverts,
    ] = await Promise.all([
      // Total adherents
      prisma.adherent.count(),

      // Active adherents
      prisma.adherent.count({
        where: { isActive: true },
      }),

      // Paid cotisations for current year
      prisma.cotisation.count({
        where: { year: currentYear, status: "PAID" },
      }),

      // Pending cotisations for current year
      prisma.cotisation.count({
        where: { year: currentYear, status: "PENDING" },
      }),

      // Overdue cotisations for current year
      prisma.cotisation.count({
        where: { year: currentYear, status: "OVERDUE" },
      }),

      // Sum of paid cotisations for current year
      prisma.cotisation.aggregate({
        where: { year: currentYear, status: "PAID" },
        _sum: { amount: true },
      }),

      // Total cotisations for current year (for taux de recouvrement)
      prisma.cotisation.count({
        where: { year: currentYear },
      }),

      // Active mandats
      prisma.mandatAssignment.count({
        where: { status: "ACTIVE" },
      }),

      // Open tickets
      prisma.ticket.count({
        where: { status: { in: ["OUVERT", "EN_COURS"] } },
      }),
    ]);

    const totalRecettes = totalRecettesResult._sum.amount ?? 0;
    const tauxRecouvrement =
      totalCotisationsCurrentYear > 0
        ? Math.round((cotisationsPayees / totalCotisationsCurrentYear) * 10000) / 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalAdherents,
        adherentsActifs,
        cotisationsPayees,
        cotisationsEnAttente,
        cotisationsEnRetard,
        totalRecettes,
        tauxRecouvrement,
        mandatsActifs,
        ticketsOuverts,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
