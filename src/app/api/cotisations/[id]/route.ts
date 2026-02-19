import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCotisations, canLiftSuspension, canManageUsers } from "@/types/rbac";
import { z } from "zod";

// =============================================================================
// Schema
// =============================================================================

const updateCotisationSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "SUSPENDED"]).optional(),
  amount: z.number().positive().optional(),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Date invalide",
    })
    .optional(),
  notes: z.string().optional().nullable(),
  invoiceRef: z.string().optional().nullable(),
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "OVERDUE", "SUSPENDED"],
  OVERDUE: ["PAID", "SUSPENDED"],
  PAID: [], // Cannot change from PAID (immutable once paid)
  SUSPENDED: ["PAID", "PENDING"], // Requires canLiftSuspension
};

// =============================================================================
// Helper: update cotisation with proper logic
// =============================================================================

async function handleUpdate(
  req: NextRequest,
  params: { id: string }
) {
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

  const body = await req.json();
  const parsed = updateCotisationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const existing = await prisma.cotisation.findUnique({
    where: { id: params.id },
    include: { adherent: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Cotisation non trouvée" },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.invoiceRef !== undefined) updateData.invoiceRef = data.invoiceRef;

  if (data.status !== undefined) {
    const oldStatus = existing.status;
    const newStatus = data.status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[oldStatus] ?? [];
    if (oldStatus !== newStatus && !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Transition de statut invalide: ${oldStatus} → ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // Lifting suspension requires PRESIDENT/ADMIN
    if (oldStatus === "SUSPENDED" && newStatus !== "SUSPENDED") {
      if (!canLiftSuspension(session.user.role)) {
        return NextResponse.json(
          {
            error:
              "Seul le Président ou l'Administrateur peut lever une suspension",
          },
          { status: 403 }
        );
      }
    }

    updateData.status = newStatus;

    // When PAID, set paidAt
    if (newStatus === "PAID") {
      updateData.paidAt = new Date();
    }

    // When SUSPENDED, deactivate adherent
    if (newStatus === "SUSPENDED" && oldStatus !== "SUSPENDED") {
      await prisma.adherent.update({
        where: { id: existing.adherentId },
        data: { isActive: false },
      });
    }

    // When lifting suspension to PAID, reactivate ONLY if no other
    // active suspension exists and the user was deactivated by suspension
    if (oldStatus === "SUSPENDED" && newStatus === "PAID") {
      const otherSuspensions = await prisma.cotisation.count({
        where: {
          adherentId: existing.adherentId,
          status: "SUSPENDED",
          id: { not: existing.id },
        },
      });
      if (otherSuspensions === 0) {
        await prisma.adherent.update({
          where: { id: existing.adherentId },
          data: { isActive: true },
        });
      }
    }
  }

  const cotisation = await prisma.cotisation.update({
    where: { id: params.id },
    data: updateData,
    include: {
      adherent: {
        select: {
          id: true,
          companyName: true,
          isActive: true,
          user: {
            select: { email: true, name: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: cotisation });
}

// =============================================================================
// PUT /api/cotisations/[id] - Update cotisation
// =============================================================================

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await handleUpdate(req, params);
  } catch (error) {
    console.error("Error updating cotisation:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/cotisations/[id] - Update cotisation (alias for PUT)
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await handleUpdate(req, params);
  } catch (error) {
    console.error("Error updating cotisation:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/cotisations/[id] - Delete cotisation (ADMIN only)
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

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes. Seul un administrateur peut supprimer une cotisation." },
        { status: 403 }
      );
    }

    const existing = await prisma.cotisation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Cotisation non trouvée" },
        { status: 404 }
      );
    }

    await prisma.cotisation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Cotisation supprimée avec succès",
    });
  } catch (error) {
    console.error("Error deleting cotisation:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
