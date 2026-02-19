import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCotisations } from "@/types/rbac";
import { getCotisationAmount } from "@/utils/cotisation";
import { z } from "zod";

// =============================================================================
// POST /api/cotisations/generate - Generate cotisations for all active adherents
// =============================================================================

const generateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date d'\u00e9ch\u00e9ance invalide",
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autoris\u00e9" },
        { status: 401 }
      );
    }

    if (!canManageCotisations(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { year, dueDate } = parsed.data;

    // Get all active adherents
    const activeAdherents = await prisma.adherent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        effectif: true,
      },
    });

    // Get existing cotisations for this year to skip duplicates
    const existingCotisations = await prisma.cotisation.findMany({
      where: { year },
      select: { adherentId: true },
    });
    const existingAdherentIds = new Set(
      existingCotisations.map((c) => c.adherentId)
    );

    // Filter out adherents that already have a cotisation for this year
    const adherentsToGenerate = activeAdherents.filter(
      (a) => !existingAdherentIds.has(a.id)
    );

    if (adherentsToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune cotisation \u00e0 g\u00e9n\u00e9rer. Tous les adh\u00e9rents actifs ont d\u00e9j\u00e0 une cotisation pour cette ann\u00e9e.",
        count: 0,
      });
    }

    // Create cotisations in a transaction
    const cotisations = await prisma.$transaction(
      adherentsToGenerate.map((adherent) =>
        prisma.cotisation.create({
          data: {
            adherentId: adherent.id,
            year,
            amount: getCotisationAmount(adherent.effectif),
            dueDate: new Date(dueDate),
          },
        })
      )
    );

    return NextResponse.json(
      {
        success: true,
        message: `${cotisations.length} cotisation(s) g\u00e9n\u00e9r\u00e9e(s) avec succ\u00e8s`,
        count: cotisations.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating cotisations:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
