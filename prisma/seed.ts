import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@observatoire-pme.fr" },
    update: {},
    create: {
      email: "admin@observatoire-pme.fr",
      name: "Administrateur",
      passwordHash: adminPassword,
      role: "ADMIN",
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  // Create demo entrepreneur
  const demoPassword = await bcrypt.hash("Demo1234!", 12);
  const entrepreneur = await prisma.user.upsert({
    where: { email: "demo@entreprise.fr" },
    update: {},
    create: {
      email: "demo@entreprise.fr",
      name: "Marie Dupont",
      passwordHash: demoPassword,
      role: "ENTREPRENEUR",
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  // Create demo company
  const company = await prisma.company.upsert({
    where: { userId: entrepreneur.id },
    update: {},
    create: {
      userId: entrepreneur.id,
      name: "Dupont & Fils SARL",
      sector: "Commerce",
      effectif: 12,
      caAnnuel: 800000,
      statutJuridique: "SARL",
      region: "Île-de-France",
    },
  });

  // Create sample diagnostic
  await prisma.diagnostic.create({
    data: {
      userId: entrepreneur.id,
      companyId: company.id,
      rawAnswers: {
        effectif: 12,
        secteur: "Commerce",
        caAnnuel: 800000,
        statutJuridique: "SARL",
        region: "Île-de-France",
        nombreDeclarations: 15,
        tempsMensuelFiscal: 25,
        coutConformite: 18000,
        nombreProceduresRH: 8,
        nombreInterlocuteurs: 6,
        scoreDifficultePercue: 7,
        tempsAdminHebdo: 20,
        nombrePlateformes: 6,
        doubleSaisie: true,
      },
      complexityScore: 52.3,
      fiscalScore: 48.7,
      socialScore: 55.2,
      adminScore: 58.1,
    },
  });

  // Create sample signalements
  const signalements = [
    {
      title: "Déclaration TVA mensuelle trop fréquente",
      description:
        "La déclaration TVA mensuelle mobilise 2 jours par mois pour une PME de 12 salariés. Un passage au trimestriel serait plus adapté pour les petites structures.",
      estimatedTimeLoss: 48,
      estimatedCost: 8000,
      level: "NATIONAL" as const,
      sector: "Commerce",
      severityScore: 35.2,
    },
    {
      title: "Multiplication des plateformes administratives",
      description:
        "Nous devons jongler entre impots.gouv, net-entreprises, URSSAF, MSA et 3 autres portails différents. Aucune interopérabilité, informations à ressaisir systématiquement.",
      estimatedTimeLoss: 120,
      estimatedCost: 15000,
      level: "NATIONAL" as const,
      sector: "Tous secteurs",
      severityScore: 52.8,
    },
    {
      title: "Normes accessibilité disproportionnées pour petits commerces",
      description:
        "Les normes d'accessibilité ERP sont identiques pour un commerce de 30m² et un hypermarché. Le coût de mise en conformité est démesuré pour les petites structures.",
      estimatedTimeLoss: 40,
      estimatedCost: 25000,
      level: "LOCAL" as const,
      sector: "Commerce",
      severityScore: 41.5,
    },
  ];

  for (const s of signalements) {
    await prisma.signalement.create({
      data: {
        userId: entrepreneur.id,
        ...s,
      },
    });
  }

  // Create analyste user
  await prisma.user.upsert({
    where: { email: "analyste@observatoire-pme.fr" },
    update: {},
    create: {
      email: "analyste@observatoire-pme.fr",
      name: "Pierre Martin",
      passwordHash: await bcrypt.hash("Analyste1!", 12),
      role: "ANALYSTE",
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  console.log("Seed data created successfully");
  console.log("Admin: admin@observatoire-pme.fr / Admin123!");
  console.log("Entrepreneur: demo@entreprise.fr / Demo1234!");
  console.log("Analyste: analyste@observatoire-pme.fr / Analyste1!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
