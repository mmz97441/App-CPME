import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types/rbac";
import type { Role } from "@prisma/client";

// =============================================================================
// GET /api/dashboard - Dashboard statistics (role-aware)
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

    const userRole = session.user.role as Role;
    const currentYear = new Date().getFullYear();

    // ADHERENT role: show only their own data
    if (userRole === "ADHERENT") {
      const adherent = await prisma.adherent.findFirst({
        where: { userId: session.user.id },
        include: {
          cotisations: { where: { year: currentYear }, take: 1 },
          mandatAssignments: { where: { status: "ACTIVE" } },
        },
      });

      const myCotisation = adherent?.cotisations[0] ?? null;
      const myTickets = await prisma.ticket.count({
        where: {
          createdById: session.user.id,
          status: { in: ["OUVERT", "EN_COURS"] },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          totalAdherents: 0,
          adherentsActifs: 0,
          cotisationsPayees: myCotisation?.status === "PAID" ? 1 : 0,
          cotisationsEnAttente: myCotisation?.status === "PENDING" ? 1 : 0,
          cotisationsEnRetard: myCotisation?.status === "OVERDUE" ? 1 : 0,
          totalRecettes: 0,
          tauxRecouvrement: 0,
          mandatsActifs: adherent?.mandatAssignments.length ?? 0,
          ticketsOuverts: myTickets,
          maCotisation: myCotisation
            ? { status: myCotisation.status, amount: myCotisation.amount, dueDate: myCotisation.dueDate }
            : null,
        },
      });
    }

    // Only TRESORIER+ can see financial details
    const canSeeFinances = hasMinRole(userRole, "TRESORIER");

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
      prisma.adherent.count(),
      prisma.adherent.count({ where: { isActive: true } }),
      prisma.cotisation.count({ where: { year: currentYear, status: "PAID" } }),
      prisma.cotisation.count({ where: { year: currentYear, status: "PENDING" } }),
      prisma.cotisation.count({ where: { year: currentYear, status: "OVERDUE" } }),
      canSeeFinances
        ? prisma.cotisation.aggregate({
            where: { year: currentYear, status: "PAID" },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null } }),
      prisma.cotisation.count({ where: { year: currentYear } }),
      prisma.mandatAssignment.count({ where: { status: "ACTIVE" } }),
      prisma.ticket.count({ where: { status: { in: ["OUVERT", "EN_COURS"] } } }),
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
        totalRecettes: canSeeFinances ? totalRecettes : 0,
        tauxRecouvrement: canSeeFinances ? tauxRecouvrement : 0,
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
