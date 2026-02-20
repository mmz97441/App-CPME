import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/types/rbac";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// =============================================================================
// PUT /api/admin/users/[id] - Update user (role, name, email, isActive)
// =============================================================================

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email("Email invalide").optional(),
  role: z
    .enum([
      "ADMIN",
      "PRESIDENT",
      "DELEGUE_GENERAL",
      "TRESORIER",
      "MEMBRE_BUREAU",
      "MEMBRE_CA",
      "ADHERENT",
    ])
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
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
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Cannot edit your own role or deactivate yourself
    if (params.id === session.user.id) {
      if (data.role !== undefined) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas modifier votre propre rôle" },
          { status: 400 }
        );
      }
      if (data.isActive === false) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas vous désactiver vous-même" },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cet email" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      // Also update adherent isActive if exists
      const adherent = await prisma.adherent.findFirst({
        where: { userId: params.id },
      });
      if (adherent) {
        await prisma.adherent.update({
          where: { id: adherent.id },
          data: { isActive: data.isActive },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        adherent: { select: { id: true, companyName: true } },
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/admin/users/[id] - Alias for PUT
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(req, { params });
}

// =============================================================================
// DELETE /api/admin/users/[id] - Soft delete (deactivate user)
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
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      const adherent = await tx.adherent.findFirst({
        where: { userId: params.id },
      });
      if (adherent) {
        await tx.adherent.update({
          where: { id: adherent.id },
          data: { isActive: false },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Utilisateur désactivé",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/users/[id] - Reset password
// =============================================================================

export async function POST(
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
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const tempPassword = crypto.randomBytes(12).toString("base64url");
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      tempPassword,
      message: `Mot de passe réinitialisé pour ${existing.email}`,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
