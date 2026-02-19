import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMandats } from "@/types/rbac";
import { z } from "zod";

// =============================================================================
// GET /api/mandats - List all mandats with filters
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

    if (!canManageMandats(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const classification = searchParams.get("classification");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { organisme: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (classification && (classification === "STRATEGIQUE" || classification === "TECHNIQUE")) {
      where.classification = classification;
    }

    const mandats = await prisma.mandat.findMany({
      where,
      include: {
        assignments: {
          include: {
            adherent: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: mandats });
  } catch (error) {
    console.error("Error fetching mandats:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/mandats - Create a new mandat
// =============================================================================

const createMandatSchema = z.object({
  name: z.string().min(1, "Le nom du mandat est requis"),
  organisme: z.string().min(1, "L'organisme est requis"),
  classification: z.enum(["STRATEGIQUE", "TECHNIQUE"], {
    errorMap: () => ({ message: "La classification doit être STRATEGIQUE ou TECHNIQUE" }),
  }),
  description: z.string().optional(),
  feuilleDeRoute: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    if (!canManageMandats(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createMandatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const mandat = await prisma.mandat.create({
      data: {
        name: data.name,
        organisme: data.organisme,
        classification: data.classification,
        description: data.description,
        feuilleDeRoute: data.feuilleDeRoute,
      },
      include: {
        assignments: {
          include: {
            adherent: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: mandat }, { status: 201 });
  } catch (error) {
    console.error("Error creating mandat:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
