import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCotisations } from "@/types/rbac";
import { z } from "zod";

// =============================================================================
// GET /api/cotisations - List all cotisations with adherent info
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

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const adherentId = searchParams.get("adherentId");

    const where: Record<string, unknown> = {};

    // RBAC: ADHERENT can only see their own cotisations
    if (session.user.role === "ADHERENT") {
      const myAdherent = await prisma.adherent.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!myAdherent) {
        return NextResponse.json({ success: true, data: [] });
      }
      where.adherentId = myAdherent.id;
    }

    if (year) {
      where.year = parseInt(year, 10);
    }

    if (status) {
      where.status = status;
    }

    if (adherentId) {
      where.adherentId = adherentId;
    }

    const cotisations = await prisma.cotisation.findMany({
      where,
      include: {
        adherent: {
          select: {
            id: true,
            companyName: true,
            siret: true,
            secteur: true,
            type: true,
            effectif: true,
            isVIP: true,
            isActive: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: cotisations });
  } catch (error) {
    console.error("Error fetching cotisations:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/cotisations - Create a single cotisation
// =============================================================================

const createCotisationSchema = z.object({
  adherentId: z.string().min(1, "L'identifiant de l'adh\u00e9rent est requis"),
  year: z.number().int().min(2000).max(2100),
  amount: z.number().positive("Le montant doit \u00eatre positif"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date d'\u00e9ch\u00e9ance invalide",
  }),
  notes: z.string().optional(),
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
    const parsed = createCotisationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check adherent exists
    const adherent = await prisma.adherent.findUnique({
      where: { id: data.adherentId },
    });
    if (!adherent) {
      return NextResponse.json(
        { error: "Adh\u00e9rent non trouv\u00e9" },
        { status: 404 }
      );
    }

    // Check if cotisation already exists for this adherent and year
    const existing = await prisma.cotisation.findUnique({
      where: {
        adherentId_year: {
          adherentId: data.adherentId,
          year: data.year,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Une cotisation existe d\u00e9j\u00e0 pour cet adh\u00e9rent et cette ann\u00e9e" },
        { status: 409 }
      );
    }

    const cotisation = await prisma.cotisation.create({
      data: {
        adherentId: data.adherentId,
        year: data.year,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        notes: data.notes,
      },
      include: {
        adherent: {
          select: {
            id: true,
            companyName: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: cotisation },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating cotisation:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
