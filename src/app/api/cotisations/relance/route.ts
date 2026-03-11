import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCotisations } from "@/types/rbac";

// =============================================================================
// POST /api/cotisations/relance - Mark overdue cotisations and get relance list
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    if (!canManageCotisations(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Auto-mark PENDING cotisations as OVERDUE if past due date
    const overdueResult = await prisma.cotisation.updateMany({
      where: {
        status: "PENDING",
        dueDate: { lt: now },
      },
      data: {
        status: "OVERDUE",
      },
    });

    // Get all overdue cotisations for the relance list
    const overdueCotisations = await prisma.cotisation.findMany({
      where: {
        status: "OVERDUE",
      },
      include: {
        adherent: {
          select: {
            id: true,
            companyName: true,
            phone: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: {
        newlyMarkedOverdue: overdueResult.count,
        totalOverdue: overdueCotisations.length,
        relanceList: overdueCotisations.map((cot) => ({
          cotisationId: cot.id,
          year: cot.year,
          amount: cot.amount,
          dueDate: cot.dueDate,
          companyName: cot.adherent.companyName,
          contactName: cot.adherent.user.name,
          contactEmail: cot.adherent.user.email,
          contactPhone: cot.adherent.phone,
          daysOverdue: Math.floor(
            (now.getTime() - new Date(cot.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          ),
        })),
      },
    });
  } catch (error) {
    console.error("Error processing relance:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
