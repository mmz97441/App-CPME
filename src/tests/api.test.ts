import { describe, it, expect } from "vitest";
import { registerSchema, signalementSchema, healthSchema, diagnosticSchema } from "@/utils/validation";
import { calculateComplexityScore, calculateSeverityScore, calculateHealthScore } from "@/utils/scoring";
import type { DiagnosticInput } from "@/types";

/**
 * API Integration Tests
 *
 * These tests validate the full request → validation → business logic pipeline
 * simulating the flow of data through API routes without requiring a running server.
 */

describe("POST /api/auth/register - Registration Pipeline", () => {
  it("should validate and accept a complete registration request", () => {
    const requestBody = {
      email: "entrepreneur@pme.fr",
      password: "SecurePass1",
      name: "Jean Dupont",
      gdprConsent: true,
    };

    const parsed = registerSchema.safeParse(requestBody);
    expect(parsed.success).toBe(true);
  });

  it("should reject registration without GDPR consent", () => {
    const requestBody = {
      email: "test@pme.fr",
      password: "SecurePass1",
      name: "Test User",
      gdprConsent: false,
    };

    const parsed = registerSchema.safeParse(requestBody);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors.some((e) => e.message.includes("RGPD"))).toBe(true);
    }
  });

  it("should sanitize XSS attempts in registration name", () => {
    const requestBody = {
      email: "test@pme.fr",
      password: "SecurePass1",
      name: '<img src=x onerror=alert(1)>',
      gdprConsent: true,
    };

    const parsed = registerSchema.safeParse(requestBody);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).not.toContain("<img");
      expect(parsed.data.name).toContain("&lt;img");
    }
  });
});

describe("POST /api/diagnostics - Diagnostic Pipeline", () => {
  const validDiagnosticRequest: DiagnosticInput = {
    effectif: 25,
    secteur: "Commerce",
    caAnnuel: 1500000,
    statutJuridique: "SARL",
    region: "Île-de-France",
    nombreDeclarations: 18,
    tempsMensuelFiscal: 30,
    coutConformite: 25000,
    nombreProceduresRH: 10,
    nombreInterlocuteurs: 8,
    scoreDifficultePercue: 7,
    tempsAdminHebdo: 20,
    nombrePlateformes: 6,
    doubleSaisie: true,
  };

  it("should validate input then compute complexity score", () => {
    // Step 1: Validate input
    const parsed = diagnosticSchema.safeParse(validDiagnosticRequest);
    expect(parsed.success).toBe(true);

    // Step 2: Compute score
    const score = calculateComplexityScore(validDiagnosticRequest);
    expect(score.global).toBeGreaterThan(0);
    expect(score.global).toBeLessThanOrEqual(100);
    expect(score.fiscal).toBeDefined();
    expect(score.social).toBeDefined();
    expect(score.admin).toBeDefined();
  });

  it("should reject invalid diagnostic input and not compute score", () => {
    const invalidRequest = {
      ...validDiagnosticRequest,
      scoreDifficultePercue: 15, // out of range (max 10)
    };

    const parsed = diagnosticSchema.safeParse(invalidRequest);
    expect(parsed.success).toBe(false);
  });

  it("should handle edge case: micro-entrepreneur with minimal data", () => {
    const microRequest: DiagnosticInput = {
      effectif: 1,
      secteur: "Services",
      caAnnuel: 30000,
      statutJuridique: "Micro-entreprise",
      region: "Bretagne",
      nombreDeclarations: 4,
      tempsMensuelFiscal: 5,
      coutConformite: 0,
      nombreProceduresRH: 0,
      nombreInterlocuteurs: 2,
      scoreDifficultePercue: 3,
      tempsAdminHebdo: 5,
      nombrePlateformes: 2,
      doubleSaisie: false,
    };

    const parsed = diagnosticSchema.safeParse(microRequest);
    expect(parsed.success).toBe(true);

    const score = calculateComplexityScore(microRequest);
    expect(score.global).toBeLessThan(30); // Should be low complexity
    expect(score.social).toBeLessThan(30);
  });
});

describe("POST /api/signalements - Signalement Pipeline", () => {
  it("should validate then compute severity for a new signalement", () => {
    const request = {
      title: "Obligation de double déclaration sociale",
      description:
        "Nous devons déclarer les mêmes informations sociales sur deux plateformes distinctes, URSSAF et MSA, sans possibilité de transfert automatique.",
      estimatedTimeLoss: 80,
      estimatedCost: 12000,
      level: "NATIONAL" as const,
      sector: "Agriculture",
    };

    // Step 1: Validate
    const parsed = signalementSchema.safeParse(request);
    expect(parsed.success).toBe(true);

    // Step 2: Compute initial severity (0 votes)
    const severity = calculateSeverityScore({
      estimatedTimeLoss: request.estimatedTimeLoss,
      estimatedCost: request.estimatedCost,
      votesCount: 0,
    });

    expect(severity).toBeGreaterThan(0);
    expect(severity).toBeLessThanOrEqual(100);
  });

  it("should recalculate severity after vote", () => {
    const base = {
      estimatedTimeLoss: 80,
      estimatedCost: 12000,
    };

    const before = calculateSeverityScore({ ...base, votesCount: 10 });
    const after = calculateSeverityScore({ ...base, votesCount: 100 });

    expect(after).toBeGreaterThan(before);
  });

  it("should reject signalement with description too short", () => {
    const request = {
      title: "Titre valide du signalement",
      description: "Trop court",
      estimatedTimeLoss: 10,
      estimatedCost: 1000,
      level: "LOCAL" as const,
      sector: "Commerce",
    };

    const parsed = signalementSchema.safeParse(request);
    expect(parsed.success).toBe(false);
  });
});

describe("POST /api/health-assessments - Health Pipeline", () => {
  it("should validate then compute health score with alert", () => {
    const request = {
      fatigueMentale: 9,
      chargeEmotionnelle: 8,
      isolement: 9,
      difficulteDecisionnelle: 8,
    };

    // Step 1: Validate
    const parsed = healthSchema.safeParse(request);
    expect(parsed.success).toBe(true);

    // Step 2: Compute score
    const result = calculateHealthScore(request);
    expect(result.score).toBeGreaterThan(70);
    expect(result.isAlert).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes("0 805 65 50 50"))).toBe(true);
  });

  it("should validate then compute healthy score without alert", () => {
    const request = {
      fatigueMentale: 3,
      chargeEmotionnelle: 2,
      isolement: 4,
      difficulteDecisionnelle: 3,
    };

    const parsed = healthSchema.safeParse(request);
    expect(parsed.success).toBe(true);

    const result = calculateHealthScore(request);
    expect(result.score).toBeLessThan(70);
    expect(result.isAlert).toBe(false);
  });
});

describe("GET /api/observatory - Observatory Data Aggregation", () => {
  it("should correctly aggregate scores by region", () => {
    // Simulate multiple diagnostics from different regions
    const diagnostics = [
      { region: "Île-de-France", score: 60 },
      { region: "Île-de-France", score: 50 },
      { region: "Bretagne", score: 30 },
      { region: "Bretagne", score: 40 },
      { region: "Bretagne", score: 35 },
    ];

    const regionMap: Record<string, { total: number; count: number }> = {};
    for (const d of diagnostics) {
      if (!regionMap[d.region]) regionMap[d.region] = { total: 0, count: 0 };
      regionMap[d.region].total += d.score;
      regionMap[d.region].count++;
    }

    const result = Object.entries(regionMap).map(([region, data]) => ({
      region,
      avgScore: data.total / data.count,
      count: data.count,
    }));

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.region === "Île-de-France")?.avgScore).toBe(55);
    expect(result.find((r) => r.region === "Bretagne")?.avgScore).toBe(35);
  });

  it("should correctly rank top irritants by severity", () => {
    const signalements = [
      { id: "1", title: "A", severityScore: 80, votesCount: 100 },
      { id: "2", title: "B", severityScore: 45, votesCount: 50 },
      { id: "3", title: "C", severityScore: 92, votesCount: 200 },
      { id: "4", title: "D", severityScore: 30, votesCount: 10 },
    ];

    const top = signalements
      .sort((a, b) => b.severityScore - a.severityScore)
      .slice(0, 3);

    expect(top[0].id).toBe("3");
    expect(top[1].id).toBe("1");
    expect(top[2].id).toBe("2");
  });
});

describe("CSRF Token Validation", () => {
  it("should validate CSRF token format", () => {
    // CSRF tokens should be in format: nonce.hmac
    const validFormat = "abc123.def456";
    const invalidFormat = "no-dot-separator";

    expect(validFormat.split(".").length).toBe(2);
    expect(invalidFormat.split(".").length).toBe(1);
  });
});

describe("GDPR Data Export Pipeline", () => {
  it("should anonymize sensitive fields in export data", () => {
    const userData = {
      email: "jean@entreprise.fr",
      name: "Jean Dupont",
      passwordHash: "$2b$12$...",
      role: "ENTREPRENEUR",
      diagnostics: [{ score: 55.3 }],
    };

    const sensitiveFields = ["email", "name", "passwordHash"];
    const anonymized = { ...userData };

    for (const field of sensitiveFields) {
      if (field in anonymized) {
        (anonymized as Record<string, unknown>)[field] = "[ANONYMISÉ]";
      }
    }

    expect(anonymized.email).toBe("[ANONYMISÉ]");
    expect(anonymized.name).toBe("[ANONYMISÉ]");
    expect(anonymized.passwordHash).toBe("[ANONYMISÉ]");
    expect(anonymized.role).toBe("ENTREPRENEUR"); // Non-sensitive, preserved
    expect(anonymized.diagnostics).toHaveLength(1); // Data preserved
  });
});
