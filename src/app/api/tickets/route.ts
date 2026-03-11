import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
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

    // ADHERENT can only see their own tickets
    if (session.user.role === "ADHERENT") {
      where.createdById = session.user.id;
    }

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
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        adherent: {
          select: { id: true, companyName: true, siret: true },
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
// POST /api/tickets - Create a new ticket (Zod validated)
// =============================================================================

const createTicketSchema = z.object({
  category: z.enum(["JURIDIQUE", "PRESSE", "COTISATION", "AUTRE"], {
    errorMap: () => ({ message: "Catégorie invalide" }),
  }),
  subject: z
    .string()
    .min(1, "Le sujet est requis")
    .max(500, "Le sujet ne doit pas dépasser 500 caractères"),
  adherentId: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(3).default(0),
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

    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate adherentId exists if provided
    if (data.adherentId) {
      const adherent = await prisma.adherent.findUnique({
        where: { id: data.adherentId },
      });
      if (!adherent) {
        return NextResponse.json(
          { error: "Adhérent non trouvé" },
          { status: 400 }
        );
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        category: data.category,
        subject: data.subject.trim(),
        adherentId: data.adherentId || null,
        priority: data.priority,
        createdById: session.user.id,
      },
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
