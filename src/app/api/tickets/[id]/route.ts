import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        adherent: {
          select: {
            id: true,
            companyName: true,
            siret: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
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
// PUT /api/tickets/[id] - Update a ticket
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
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        adherent: {
          select: {
            id: true,
            companyName: true,
            siret: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
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
