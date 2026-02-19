import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// =============================================================================
// GET /api/tickets - List tickets with filters
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: Prisma.TicketWhereInput = {};

    if (status) {
      where.status = status as Prisma.TicketWhereInput["status"];
    }

    if (category) {
      where.category = category as Prisma.TicketWhereInput["category"];
    }

    if (search) {
      where.subject = { contains: search, mode: "insensitive" };
    }

    const tickets = await prisma.ticket.findMany({
      where,
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
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tickets - Create a new ticket
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { category, subject, adherentId, priority } = body;

    if (!category || !subject) {
      return NextResponse.json(
        { error: "La catégorie et le sujet sont requis" },
        { status: 400 }
      );
    }

    const validCategories = ["JURIDIQUE", "PRESSE", "COTISATION", "AUTRE"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Catégorie invalide" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.create({
      data: {
        category,
        subject,
        adherentId: adherentId || null,
        priority: typeof priority === "number" ? priority : 0,
        createdById: session.user.id,
      },
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
      },
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
