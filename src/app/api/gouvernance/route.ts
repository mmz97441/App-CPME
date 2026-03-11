import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageGouvernance } from "@/types/rbac";

// =============================================================================
// GET /api/gouvernance - List all instances with recent convocations
// =============================================================================

export async function GET() {
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

    const instances = await prisma.instance.findMany({
      include: {
        convocations: {
          orderBy: { date: "desc" },
          take: 5,
          include: {
            _count: {
              select: {
                emargements: true,
              },
            },
          },
        },
        voteSessions: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = instances.map((instance) => ({
      id: instance.id,
      name: instance.name,
      description: instance.description,
      createdAt: instance.createdAt,
      convocationCount: instance.convocations.length,
      voteSessionCount: instance.voteSessions.length,
      recentConvocations: instance.convocations.map((conv) => ({
        id: conv.id,
        date: conv.date,
        subject: conv.subject,
        description: conv.description,
        location: conv.location,
        isOnline: conv.isOnline,
        onlineLink: conv.onlineLink,
        emargementCount: conv._count.emargements,
      })),
      nextConvocation:
        instance.convocations.find((conv) => new Date(conv.date) >= new Date()) ??
        null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching gouvernance data:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
