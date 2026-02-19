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
    .refine((val) => !isNaN(Date.parse(val)), { message: "Date invalide" })
    .optional(),
  notes: z.string().optional().nullable(),
  invoiceRef: z.string().optional().nullable(),
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "OVERDUE", "SUSPENDED"],
  OVERDUE: ["PAID", "SUSPENDED"],
  PAID: [], // Immutable once paid
  SUSPENDED: ["PAID", "PENDING"], // Requires canLiftSuspension
};

// =============================================================================
// Helper: update cotisation inside a transaction
// =============================================================================

async function handleUpdate(req: NextRequest, params: { id: string }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!canManageCotisations(session.user.role)) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
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

  // Pre-validate before transaction
  if (data.status !== undefined) {
    const existing = await prisma.cotisation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cotisation non trouvée" }, { status: 404 });
    }

    const oldStatus = existing.status;
    const newStatus = data.status;

    if (oldStatus !== newStatus) {
      const allowed = VALID_TRANSITIONS[oldStatus] ?? [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Transition de statut invalide: ${oldStatus} → ${newStatus}` },
          { status: 400 }
        );
      }
    }

    if (oldStatus === "SUSPENDED" && newStatus !== "SUSPENDED") {
      if (!canLiftSuspension(session.user.role)) {
        return NextResponse.json(
          { error: "Seul le Président ou l'Administrateur peut lever une suspension" },
          { status: 403 }
        );
      }
    }
  }

  // Run in transaction to prevent race conditions
  try {
    const cotisation = await prisma.$transaction(async (tx) => {
      const existing = await tx.cotisation.findUnique({
        where: { id: params.id },
        include: { adherent: true },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      const updateData: Record<string, unknown> = {};

      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.invoiceRef !== undefined) updateData.invoiceRef = data.invoiceRef;

      if (data.status !== undefined) {
        const oldStatus = existing.status;
        const newStatus = data.status;

        // Re-validate inside transaction
        if (oldStatus !== newStatus) {
          const allowed = VALID_TRANSITIONS[oldStatus] ?? [];
          if (!allowed.includes(newStatus)) {
            throw new Error("INVALID_TRANSITION");
          }
        }

        updateData.status = newStatus;

        if (newStatus === "PAID") {
          updateData.paidAt = new Date();
        }

        // SUSPENDED → deactivate adherent
        if (newStatus === "SUSPENDED" && oldStatus !== "SUSPENDED") {
          await tx.adherent.update({
            where: { id: existing.adherentId },
            data: { isActive: false },
          });
        }

        // Lifting suspension → reactivate only if no other current year suspensions
        if (oldStatus === "SUSPENDED" && newStatus === "PAID") {
          const currentYear = new Date().getFullYear();
          const otherSuspensions = await tx.cotisation.count({
            where: {
              adherentId: existing.adherentId,
              status: "SUSPENDED",
              year: currentYear,
              id: { not: existing.id },
            },
          });
          if (otherSuspensions === 0) {
            await tx.adherent.update({
              where: { id: existing.adherentId },
              data: { isActive: true },
            });
          }
        }
      }

      return tx.cotisation.update({
        where: { id: params.id },
        data: updateData,
        include: {
          adherent: {
            select: {
              id: true,
              companyName: true,
              isActive: true,
              user: { select: { email: true, name: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: cotisation });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Cotisation non trouvée" }, { status: 404 });
      }
      if (error.message === "INVALID_TRANSITION") {
        return NextResponse.json(
          { error: "Transition de statut invalide (conflit concurrent)" },
          { status: 409 }
        );
      }
    }
    throw error;
  }
}

// =============================================================================
// PUT /api/cotisations/[id]
// =============================================================================

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await handleUpdate(req, params);
  } catch (error) {
    console.error("Error updating cotisation:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

// =============================================================================
// PATCH /api/cotisations/[id] (alias)
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await handleUpdate(req, params);
  } catch (error) {
    console.error("Error updating cotisation:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/cotisations/[id] (ADMIN only)
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json(
        { error: "Seul un administrateur peut supprimer une cotisation" },
        { status: 403 }
      );
    }

    const existing = await prisma.cotisation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cotisation non trouvée" }, { status: 404 });
    }

    await prisma.cotisation.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: "Cotisation supprimée" });
  } catch (error) {
    console.error("Error deleting cotisation:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
