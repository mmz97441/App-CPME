import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageGouvernance, hasMinRole } from "@/types/rbac";
import { z } from "zod";

// =============================================================================
// GET /api/gouvernance/convocations - List convocations with filters
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

    if (!canManageGouvernance(session.user.role)) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId");
    const upcoming = searchParams.get("upcoming");

    const where: Record<string, unknown> = {};

    if (instanceId) {
      where.instanceId = instanceId;
    }

    if (upcoming === "true") {
      where.date = { gte: new Date() };
    }

    const convocations = await prisma.convocation.findMany({
      where,
      include: {
        instance: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            emargements: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const result = convocations.map((conv) => ({
      id: conv.id,
      instanceId: conv.instanceId,
      instanceName: conv.instance.name,
      createdBy: conv.createdBy,
      date: conv.date,
      subject: conv.subject,
      description: conv.description,
      location: conv.location,
      isOnline: conv.isOnline,
      onlineLink: conv.onlineLink,
      sentAt: conv.sentAt,
      createdAt: conv.createdAt,
      emargementCount: conv._count.emargements,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching convocations:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/gouvernance/convocations - Create a new convocation
// =============================================================================

const createConvocationSchema = z.object({
  instanceId: z.string().min(1, "L'instance est requise"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date invalide",
  }),
  subject: z.string().min(1, "L'objet est requis"),
  description: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  onlineLink: z.string().url("Lien en ligne invalide").optional().or(z.literal("")),
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

    // Requires DELEGUE_GENERAL+ role
    if (!hasMinRole(session.user.role, "DELEGUE_GENERAL")) {
      return NextResponse.json(
        { error: "Permissions insuffisantes. Rôle Délégué Général ou supérieur requis." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createConvocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify instance exists
    const instance = await prisma.instance.findUnique({
      where: { id: data.instanceId },
    });
    if (!instance) {
      return NextResponse.json(
        { error: "Instance non trouvée" },
        { status: 404 }
      );
    }

    const convocation = await prisma.convocation.create({
      data: {
        instanceId: data.instanceId,
        createdById: session.user.id,
        date: new Date(data.date),
        subject: data.subject,
        description: data.description,
        location: data.location,
        isOnline: data.isOnline,
        onlineLink: data.onlineLink || null,
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: convocation },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating convocation:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
