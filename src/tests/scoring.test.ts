import { describe, it, expect } from "vitest";
import {
  calculateComplexityScore,
  calculateSeverityScore,
  calculateHealthScore,
} from "@/utils/scoring";
import type { DiagnosticInput, SeverityScoreInput, HealthInput } from "@/types";

describe("calculateComplexityScore", () => {
  it("should return a score normalized to 0-100", () => {
    const input: DiagnosticInput = {
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

    const result = calculateComplexityScore(input);

    expect(result.global).toBeGreaterThanOrEqual(0);
    expect(result.global).toBeLessThanOrEqual(100);
    expect(result.fiscal).toBeGreaterThanOrEqual(0);
    expect(result.fiscal).toBeLessThanOrEqual(100);
    expect(result.social).toBeGreaterThanOrEqual(0);
    expect(result.social).toBeLessThanOrEqual(100);
    expect(result.admin).toBeGreaterThanOrEqual(0);
    expect(result.admin).toBeLessThanOrEqual(100);
  });

  it("should return low score for minimal complexity", () => {
    const input: DiagnosticInput = {
      effectif: 2,
      secteur: "Services",
      caAnnuel: 100000,
      statutJuridique: "Micro-entreprise",
      region: "Bretagne",
      nombreDeclarations: 2,
      tempsMensuelFiscal: 2,
      coutConformite: 500,
      nombreProceduresRH: 1,
      nombreInterlocuteurs: 1,
      scoreDifficultePercue: 1,
      tempsAdminHebdo: 2,
      nombrePlateformes: 1,
      doubleSaisie: false,
    };

    const result = calculateComplexityScore(input);

    expect(result.global).toBeLessThan(20);
  });

  it("should return high score for maximum complexity", () => {
    const input: DiagnosticInput = {
      effectif: 200,
      secteur: "Industrie",
      caAnnuel: 5000000,
      statutJuridique: "SA",
      region: "Île-de-France",
      nombreDeclarations: 45,
      tempsMensuelFiscal: 70,
      coutConformite: 400000,
      nombreProceduresRH: 25,
      nombreInterlocuteurs: 18,
      scoreDifficultePercue: 10,
      tempsAdminHebdo: 55,
      nombrePlateformes: 12,
      doubleSaisie: true,
    };

    const result = calculateComplexityScore(input);

    expect(result.global).toBeGreaterThan(70);
  });

  it("should return the correct component weights summing to the global score", () => {
    const input: DiagnosticInput = {
      effectif: 50,
      secteur: "BTP",
      caAnnuel: 2000000,
      statutJuridique: "SAS",
      region: "Grand Est",
      nombreDeclarations: 20,
      tempsMensuelFiscal: 30,
      coutConformite: 50000,
      nombreProceduresRH: 10,
      nombreInterlocuteurs: 10,
      scoreDifficultePercue: 7,
      tempsAdminHebdo: 25,
      nombrePlateformes: 8,
      doubleSaisie: false,
    };

    const result = calculateComplexityScore(input);

    const componentSum =
      result.details.tempsAdminComponent +
      result.details.declarationsComponent +
      result.details.coutConformiteComponent +
      result.details.scoreSubjectifComponent +
      result.details.interlocuteursComponent;

    // Allow small rounding differences
    expect(Math.abs(componentSum - result.global)).toBeLessThan(0.1);
  });

  it("should handle zero CA gracefully", () => {
    const input: DiagnosticInput = {
      effectif: 1,
      secteur: "Commerce",
      caAnnuel: 0,
      statutJuridique: "EI",
      region: "Corse",
      nombreDeclarations: 5,
      tempsMensuelFiscal: 10,
      coutConformite: 1000,
      nombreProceduresRH: 2,
      nombreInterlocuteurs: 3,
      scoreDifficultePercue: 5,
      tempsAdminHebdo: 10,
      nombrePlateformes: 3,
      doubleSaisie: false,
    };

    const result = calculateComplexityScore(input);

    expect(result.global).toBeGreaterThanOrEqual(0);
    expect(result.global).toBeLessThanOrEqual(100);
    expect(result.details.coutConformiteComponent).toBe(0);
  });
});

describe("calculateSeverityScore", () => {
  it("should return a score between 0 and 100", () => {
    const input: SeverityScoreInput = {
      estimatedTimeLoss: 100,
      estimatedCost: 20000,
      votesCount: 50,
    };

    const result = calculateSeverityScore(input);

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("should return 0 for zero inputs", () => {
    const input: SeverityScoreInput = {
      estimatedTimeLoss: 0,
      estimatedCost: 0,
      votesCount: 0,
    };

    const result = calculateSeverityScore(input);

    expect(result).toBe(0);
  });

  it("should increase with more votes", () => {
    const base: SeverityScoreInput = {
      estimatedTimeLoss: 50,
      estimatedCost: 10000,
      votesCount: 10,
    };

    const withMoreVotes: SeverityScoreInput = {
      ...base,
      votesCount: 100,
    };

    const score1 = calculateSeverityScore(base);
    const score2 = calculateSeverityScore(withMoreVotes);

    expect(score2).toBeGreaterThan(score1);
  });

  it("should give higher weight to time loss (0.4) vs cost (0.3)", () => {
    const highTime: SeverityScoreInput = {
      estimatedTimeLoss: 500,
      estimatedCost: 0,
      votesCount: 0,
    };

    const highCost: SeverityScoreInput = {
      estimatedTimeLoss: 0,
      estimatedCost: 100000,
      votesCount: 0,
    };

    const timeScore = calculateSeverityScore(highTime);
    const costScore = calculateSeverityScore(highCost);

    // Time component at max = 0.4 * 100 = 40
    // Cost component at max = 0.3 * 100 = 30
    expect(timeScore).toBeGreaterThan(costScore);
  });
});

describe("calculateHealthScore", () => {
  it("should return a score between 0 and 100", () => {
    const input: HealthInput = {
      fatigueMentale: 5,
      chargeEmotionnelle: 5,
      isolement: 5,
      difficulteDecisionnelle: 5,
    };

    const result = calculateHealthScore(input);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should trigger alert when score > 70", () => {
    const input: HealthInput = {
      fatigueMentale: 9,
      chargeEmotionnelle: 9,
      isolement: 8,
      difficulteDecisionnelle: 9,
    };

    const result = calculateHealthScore(input);

    expect(result.isAlert).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.some((r) => r.includes("ALERTE"))
    ).toBe(true);
  });

  it("should not trigger alert for low scores", () => {
    const input: HealthInput = {
      fatigueMentale: 2,
      chargeEmotionnelle: 3,
      isolement: 1,
      difficulteDecisionnelle: 2,
    };

    const result = calculateHealthScore(input);

    expect(result.isAlert).toBe(false);
  });

  it("should generate specific recommendations for high dimension scores", () => {
    const input: HealthInput = {
      fatigueMentale: 8,
      chargeEmotionnelle: 3,
      isolement: 8,
      difficulteDecisionnelle: 2,
    };

    const result = calculateHealthScore(input);

    expect(
      result.recommendations.some((r) => r.includes("fatigue mentale"))
    ).toBe(true);
    expect(
      result.recommendations.some((r) => r.includes("isolement"))
    ).toBe(true);
  });

  it("should return minimum values for all 1s", () => {
    const input: HealthInput = {
      fatigueMentale: 1,
      chargeEmotionnelle: 1,
      isolement: 1,
      difficulteDecisionnelle: 1,
    };

    const result = calculateHealthScore(input);

    expect(result.score).toBe(0);
    expect(result.isAlert).toBe(false);
  });
});
