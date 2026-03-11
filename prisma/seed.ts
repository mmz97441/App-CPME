import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CPME-OS database...");

  const adminHash = await bcrypt.hash("Admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@cpme.re" },
    update: {},
    create: {
      email: "admin@cpme.re",
      name: "Administrateur Système",
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const presidentHash = await bcrypt.hash("President123!", 12);
  await prisma.user.upsert({
    where: { email: "president@cpme.re" },
    update: {},
    create: {
      email: "president@cpme.re",
      name: "Président CPME",
      passwordHash: presidentHash,
      role: "PRESIDENT",
      isActive: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const dgHash = await bcrypt.hash("Delegue123!", 12);
  await prisma.user.upsert({
    where: { email: "dg@cpme.re" },
    update: {},
    create: {
      email: "dg@cpme.re",
      name: "Jean-Philippe Payet",
      passwordHash: dgHash,
      role: "DELEGUE_GENERAL",
      isActive: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const tresorierHash = await bcrypt.hash("Tresorier123!", 12);
  await prisma.user.upsert({
    where: { email: "tresorier@cpme.re" },
    update: {},
    create: {
      email: "tresorier@cpme.re",
      name: "Gianni Turpin",
      passwordHash: tresorierHash,
      role: "TRESORIER",
      isActive: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const adherentHash = await bcrypt.hash("Adherent123!", 12);
  const adherentUser = await prisma.user.upsert({
    where: { email: "demo@entreprise.re" },
    update: {},
    create: {
      email: "demo@entreprise.re",
      name: "Marie Dupont",
      passwordHash: adherentHash,
      role: "ADHERENT",
      isActive: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  await prisma.adherent.upsert({
    where: { userId: adherentUser.id },
    update: {},
    create: {
      userId: adherentUser.id,
      type: "DIRECT",
      companyName: "Dupont Services SARL",
      siret: "12345678901234",
      secteur: "SERVICES",
      effectif: 15,
      caAnnuel: 500000,
      isVIP: false,
      memberSince: new Date("2020-01-15"),
      phone: "0262 00 00 00",
      address: "10 rue des Palmiers",
      city: "Saint-Denis",
      postalCode: "97400",
    },
  });

  const baremes = [
    { label: "Auto-entrepreneur (0 salarié)", effectifMin: 0, effectifMax: 0, amount: 150 },
    { label: "TPE (1-5 salariés)", effectifMin: 1, effectifMax: 5, amount: 250 },
    { label: "TPE (6-10 salariés)", effectifMin: 6, effectifMax: 10, amount: 500 },
    { label: "PME (11-50 salariés)", effectifMin: 11, effectifMax: 50, amount: 1000 },
    { label: "PME (51-200 salariés)", effectifMin: 51, effectifMax: 200, amount: 2000 },
    { label: "ETI (201-500 salariés)", effectifMin: 201, effectifMax: 500, amount: 3500 },
    { label: "ETI/GE (500+ salariés)", effectifMin: 501, effectifMax: 999999, amount: 5000 },
  ];

  for (const bareme of baremes) {
    await prisma.cotisationBareme.create({ data: bareme });
  }

  await prisma.instance.upsert({
    where: { name: "Bureau" },
    update: {},
    create: { name: "Bureau", description: "Bureau de la CPME Réunion" },
  });

  await prisma.instance.upsert({
    where: { name: "Conseil d'Administration" },
    update: {},
    create: { name: "Conseil d'Administration", description: "Conseil d'Administration de la CPME Réunion" },
  });

  console.log("Seed completed!");
  console.log("  Admin:     admin@cpme.re / Admin123!");
  console.log("  Président: president@cpme.re / President123!");
  console.log("  DG:        dg@cpme.re / Delegue123!");
  console.log("  Trésorier: tresorier@cpme.re / Tresorier123!");
  console.log("  Adhérent:  demo@entreprise.re / Adherent123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
