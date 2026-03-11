import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types/rbac";
import type { Role } from "@prisma/client";

// =============================================================================
// GET /api/tickets/[id] - Get a single ticket with messages
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        adherent: {
          select: { id: true, companyName: true, siret: true },
        },
        messages: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket non trouvé" },
        { status: 404 }
      );
    }

    // ADHERENT can only see their own tickets
    const userRole = session.user.role as Role;
    if (userRole === "ADHERENT" && ticket.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/tickets/[id] - Update a ticket (MEMBRE_BUREAU+ or own ticket)
// =============================================================================

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

    const userRole = session.user.role as Role;

    const existing = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ticket non trouvé" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { status, assignedToId, priority } = body;

    // ADHERENT can only close their own tickets
    if (userRole === "ADHERENT") {
      if (existing.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "Permissions insuffisantes" },
          { status: 403 }
        );
      }
      // Adherent can only change status to FERME (close)
      if (status && status !== "FERME") {
        return NextResponse.json(
          { error: "Vous ne pouvez que fermer votre propre ticket" },
          { status: 403 }
        );
      }
      if (assignedToId !== undefined || priority !== undefined) {
        return NextResponse.json(
          { error: "Permissions insuffisantes pour modifier ces champs" },
          { status: 403 }
        );
      }
    } else if (!hasMinRole(userRole, "MEMBRE_BUREAU")) {
      // MEMBRE_CA can see but not manage tickets
      if (assignedToId !== undefined || priority !== undefined) {
        return NextResponse.json(
          { error: "Permissions insuffisantes" },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      const validStatuses = ["OUVERT", "EN_COURS", "RESOLU", "FERME"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Statut invalide" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (assignedToId !== undefined) {
      if (assignedToId !== null) {
        const user = await prisma.user.findUnique({
          where: { id: assignedToId },
        });
        if (!user) {
          return NextResponse.json(
            { error: "Utilisateur assigné non trouvé" },
            { status: 400 }
          );
        }
      }
      updateData.assignedToId = assignedToId;
    }

    if (priority !== undefined) {
      if (typeof priority !== "number") {
        return NextResponse.json(
          { error: "La priorité doit être un nombre" },
          { status: 400 }
        );
      }
      updateData.priority = priority;
    }

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        adherent: {
          select: { id: true, companyName: true, siret: true },
        },
        messages: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tickets/[id]/messages - Add a message to a ticket
// =============================================================================

export async function POST(
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket non trouvé" },
        { status: 404 }
      );
    }

    // ADHERENT can only message their own tickets
    const userRole = session.user.role as Role;
    if (userRole === "ADHERENT" && ticket.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Le contenu du message est requis" },
        { status: 400 }
      );
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: params.id,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Auto-update ticket status to EN_COURS if it was OUVERT
    if (ticket.status === "OUVERT") {
      await prisma.ticket.update({
        where: { id: params.id },
        data: { status: "EN_COURS" },
      });
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket message:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
