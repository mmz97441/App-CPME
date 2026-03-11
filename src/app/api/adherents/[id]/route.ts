import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageAdherents } from "@/types/rbac";
import { z } from "zod";

// =============================================================================
// GET /api/adherents/[id] - Get single adherent with full details
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autoris\u00e9" },
        { status: 401 }
      );
    }

    // RBAC: ADHERENT can only view their own record
    if (session.user.role === "ADHERENT") {
      const myAdherent = await prisma.adherent.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!myAdherent || myAdherent.id !== params.id) {
        return NextResponse.json(
          { error: "Permissions insuffisantes" },
          { status: 403 }
        );
      }
    }

    const adherent = await prisma.adherent.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        cotisations: {
          orderBy: { year: "desc" },
        },
        mandatAssignments: {
          include: {
            mandat: true,
          },
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!adherent) {
      return NextResponse.json(
        { error: "Adh\u00e9rent non trouv\u00e9" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: adherent });
  } catch (error) {
    console.error("Error fetching adherent:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/adherents/[id] - Update adherent
// =============================================================================

const updateAdherentSchema = z.object({
  companyName: z.string().min(1).optional(),
  siret: z.string().optional().nullable(),
  secteur: z.enum(["COMMERCE", "INDUSTRIE", "SERVICES", "BTP"]).optional(),
  type: z.enum(["DIRECT", "FEDERATION", "SYNDICAT"]).optional(),
  effectif: z.number().int().min(0).optional(),
  caAnnuel: z.number().optional().nullable(),
  isVIP: z.boolean().optional(),
  isActive: z.boolean().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autoris\u00e9" },
        { status: 401 }
      );
    }

    if (!canManageAdherents(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateAdherentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check that the adherent exists
    const existing = await prisma.adherent.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Adh\u00e9rent non trouv\u00e9" },
        { status: 404 }
      );
    }

    // Check SIRET uniqueness if changing
    if (data.siret && data.siret !== existing.siret) {
      const siretExists = await prisma.adherent.findUnique({
        where: { siret: data.siret },
      });
      if (siretExists) {
        return NextResponse.json(
          { error: "Un adh\u00e9rent existe d\u00e9j\u00e0 avec ce SIRET" },
          { status: 409 }
        );
      }
    }

    // Separate user fields from adherent fields
    const { name, email, ...adherentData } = data;

    const result = await prisma.$transaction(async (tx) => {
      // Update user fields if provided
      if (name !== undefined || email !== undefined) {
        const userUpdate: Record<string, unknown> = {};
        if (name !== undefined) userUpdate.name = name;
        if (email !== undefined) {
          // Check email uniqueness
          const emailExists = await tx.user.findFirst({
            where: {
              email,
              id: { not: existing.userId },
            },
          });
          if (emailExists) {
            throw new Error("EMAIL_EXISTS");
          }
          userUpdate.email = email;
        }
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdate,
        });
      }

      // Update adherent
      const adherent = await tx.adherent.update({
        where: { id: params.id },
        data: adherentData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      return adherent;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "Un compte existe d\u00e9j\u00e0 avec cet email" },
        { status: 409 }
      );
    }
    console.error("Error updating adherent:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/adherents/[id] - Update adherent (alias for PUT)
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(req, { params });
}

// =============================================================================
// DELETE /api/adherents/[id] - Soft delete adherent
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autoris\u00e9" },
        { status: 401 }
      );
    }

    if (!canManageAdherents(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const existing = await prisma.adherent.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Adh\u00e9rent non trouv\u00e9" },
        { status: 404 }
      );
    }

    // Soft delete: set isActive=false on both user and adherent
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      });

      await tx.adherent.update({
        where: { id: params.id },
        data: { isActive: false },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Adh\u00e9rent d\u00e9sactiv\u00e9 avec succ\u00e8s",
    });
  } catch (error) {
    console.error("Error deleting adherent:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
