import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMandats, canManageUsers } from "@/types/rbac";
import { z } from "zod";

// =============================================================================
// GET /api/mandats/[id] - Get single mandat with full details
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const mandat = await prisma.mandat.findUnique({
      where: { id: params.id },
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
            reports: {
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { startDate: "desc" },
        },
        candidatures: {
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
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!mandat) {
      return NextResponse.json(
        { error: "Mandat non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: mandat });
  } catch (error) {
    console.error("Error fetching mandat:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/mandats/[id] - Update mandat
// =============================================================================

const updateMandatSchema = z.object({
  name: z.string().min(1, "Le nom du mandat est requis").optional(),
  organisme: z.string().min(1, "L'organisme est requis").optional(),
  classification: z.enum(["STRATEGIQUE", "TECHNIQUE"]).optional(),
  description: z.string().optional().nullable(),
  feuilleDeRoute: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const parsed = updateMandatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const existing = await prisma.mandat.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Mandat non trouvé" },
        { status: 404 }
      );
    }

    const mandat = await prisma.mandat.update({
      where: { id: params.id },
      data: parsed.data,
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

    return NextResponse.json({ success: true, data: mandat });
  } catch (error) {
    console.error("Error updating mandat:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/mandats/[id] - Delete mandat (ADMIN only)
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Only ADMIN can delete mandats
    if (!canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: "Seul un administrateur peut supprimer un mandat" },
        { status: 403 }
      );
    }

    const existing = await prisma.mandat.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Mandat non trouvé" },
        { status: 404 }
      );
    }

    await prisma.mandat.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Mandat supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting mandat:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
