import { describe, it, expect } from "vitest";
import {
  registerSchema,
  diagnosticSchema,
  signalementSchema,
  healthSchema,
} from "@/utils/validation";

describe("registerSchema", () => {
  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      name: "Jean Dupont",
      gdprConsent: true,
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = registerSchema.safeParse({
      email: "invalid",
      password: "Password1",
      name: "Jean",
      gdprConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it("should reject weak password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "weak",
      name: "Jean",
      gdprConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it("should reject password without uppercase", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "password1",
      name: "Jean",
      gdprConsent: true,
    });

    expect(result.success).toBe(false);
  });

  it("should reject without GDPR consent", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      name: "Jean",
      gdprConsent: false,
    });

    expect(result.success).toBe(false);
  });

  it("should sanitize HTML in name", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      name: '<script>alert("xss")</script>Jean',
      gdprConsent: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain("<script>");
      expect(result.data.name).toContain("&lt;script&gt;");
    }
  });
});

describe("diagnosticSchema", () => {
  const validData = {
    effectif: 10,
    secteur: "Commerce",
    caAnnuel: 500000,
    statutJuridique: "SARL",
    region: "Île-de-France",
    nombreDeclarations: 12,
    tempsMensuelFiscal: 20,
    coutConformite: 15000,
    nombreProceduresRH: 5,
    nombreInterlocuteurs: 8,
    scoreDifficultePercue: 6,
    tempsAdminHebdo: 15,
    nombrePlateformes: 5,
    doubleSaisie: true,
  };

  it("should accept valid diagnostic data", () => {
    const result = diagnosticSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject negative effectif", () => {
    const result = diagnosticSchema.safeParse({ ...validData, effectif: -1 });
    expect(result.success).toBe(false);
  });

  it("should reject scoreDifficultePercue out of range", () => {
    const result = diagnosticSchema.safeParse({
      ...validData,
      scoreDifficultePercue: 11,
    });
    expect(result.success).toBe(false);
  });

  it("should reject tempsAdminHebdo > 168", () => {
    const result = diagnosticSchema.safeParse({
      ...validData,
      tempsAdminHebdo: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("signalementSchema", () => {
  it("should accept valid signalement", () => {
    const result = signalementSchema.safeParse({
      title: "Déclaration trop fréquente",
      description:
        "Cette déclaration est demandée chaque mois alors qu'elle pourrait être trimestrielle.",
      estimatedTimeLoss: 24,
      estimatedCost: 5000,
      level: "NATIONAL",
      sector: "Commerce",
    });

    expect(result.success).toBe(true);
  });

  it("should reject title too short", () => {
    const result = signalementSchema.safeParse({
      title: "AB",
      description: "Description suffisamment longue pour être valide.",
      estimatedTimeLoss: 10,
      estimatedCost: 1000,
      level: "LOCAL",
      sector: "BTP",
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid level", () => {
    const result = signalementSchema.safeParse({
      title: "Titre valide du signalement",
      description: "Description suffisamment longue pour être valide.",
      estimatedTimeLoss: 10,
      estimatedCost: 1000,
      level: "GLOBAL",
      sector: "BTP",
    });

    expect(result.success).toBe(false);
  });

  it("should sanitize HTML in title and description", () => {
    const result = signalementSchema.safeParse({
      title: '<img onerror="alert(1)">Test signalement',
      description:
        '<script>alert("xss")</script>Une description valide et assez longue.',
      estimatedTimeLoss: 10,
      estimatedCost: 1000,
      level: "LOCAL",
      sector: "Commerce",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).not.toContain("<img");
      expect(result.data.description).not.toContain("<script>");
    }
  });
});

describe("healthSchema", () => {
  it("should accept valid health data", () => {
    const result = healthSchema.safeParse({
      fatigueMentale: 5,
      chargeEmotionnelle: 3,
      isolement: 7,
      difficulteDecisionnelle: 4,
    });

    expect(result.success).toBe(true);
  });

  it("should reject values below 1", () => {
    const result = healthSchema.safeParse({
      fatigueMentale: 0,
      chargeEmotionnelle: 3,
      isolement: 7,
      difficulteDecisionnelle: 4,
    });

    expect(result.success).toBe(false);
  });

  it("should reject values above 10", () => {
    const result = healthSchema.safeParse({
      fatigueMentale: 5,
      chargeEmotionnelle: 11,
      isolement: 7,
      difficulteDecisionnelle: 4,
    });

    expect(result.success).toBe(false);
  });

  it("should reject non-integer values", () => {
    const result = healthSchema.safeParse({
      fatigueMentale: 5.5,
      chargeEmotionnelle: 3,
      isolement: 7,
      difficulteDecisionnelle: 4,
    });

    expect(result.success).toBe(false);
  });
});
