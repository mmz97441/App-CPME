import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageAdherents } from "@/types/rbac";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// =============================================================================
// GET /api/adherents - List all adherents with filters
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non autoris\u00e9" },
        { status: 401 }
      );
    }

    // ADHERENT can only see their own record
    if (session.user.role === "ADHERENT") {
      const myAdherent = await prisma.adherent.findFirst({
        where: { userId: session.user.id },
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true, isActive: true },
          },
          cotisations: {
            where: { year: new Date().getFullYear() },
            orderBy: { year: "desc" },
            take: 1,
          },
        },
      });
      if (!myAdherent) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({
        success: true,
        data: [{
          ...myAdherent,
          latestCotisation: myAdherent.cotisations[0] ?? null,
          cotisations: undefined,
        }],
      });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const secteur = searchParams.get("secteur");
    const type = searchParams.get("type");
    const isVIP = searchParams.get("isVIP");
    const status = searchParams.get("status");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { siret: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (secteur) {
      where.secteur = secteur;
    }

    if (type) {
      where.type = type;
    }

    if (isVIP !== null && isVIP !== undefined && isVIP !== "") {
      where.isVIP = isVIP === "true";
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const currentYear = new Date().getFullYear();

    const adherents = await prisma.adherent.findMany({
      where,
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
        cotisations: {
          where: { year: currentYear },
          orderBy: { year: "desc" },
          take: 1,
        },
      },
      orderBy: { companyName: "asc" },
    });

    const result = adherents.map((adherent) => ({
      ...adherent,
      latestCotisation: adherent.cotisations[0] ?? null,
      cotisations: undefined,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching adherents:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/adherents - Create new adherent with user account
// =============================================================================

const createAdherentSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Le nom est requis"),
  companyName: z.string().min(1, "Le nom de l'entreprise est requis"),
  siret: z.string().optional(),
  secteur: z.enum(["COMMERCE", "INDUSTRIE", "SERVICES", "BTP"]),
  type: z.enum(["DIRECT", "FEDERATION", "SYNDICAT"]).default("DIRECT"),
  effectif: z.number().int().min(0, "L'effectif doit \u00eatre positif"),
  caAnnuel: z.number().optional(),
  isVIP: z.boolean().default(false),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
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
    const parsed = createAdherentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe d\u00e9j\u00e0 avec cet email" },
        { status: 409 }
      );
    }

    // Check if SIRET already exists
    if (data.siret) {
      const existingSiret = await prisma.adherent.findUnique({
        where: { siret: data.siret },
      });
      if (existingSiret) {
        return NextResponse.json(
          { error: "Un adh\u00e9rent existe d\u00e9j\u00e0 avec ce SIRET" },
          { status: 409 }
        );
      }
    }

    // Generate secure temporary password
    const tempPassword = crypto.randomBytes(12).toString("base64url");
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create user and adherent in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: "ADHERENT",
        },
      });

      const adherent = await tx.adherent.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          siret: data.siret,
          secteur: data.secteur,
          type: data.type,
          effectif: data.effectif,
          caAnnuel: data.caAnnuel,
          isVIP: data.isVIP,
          phone: data.phone,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          notes: data.notes,
        },
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

    return NextResponse.json(
      { success: true, data: result, tempPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating adherent:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
