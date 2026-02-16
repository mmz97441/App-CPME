import { describe, it, expect } from "vitest";
import {
  getVisibleFields,
  generateRecommendations,
} from "@/modules/diagnostic/domain";
import {
  recalculateSeverityAfterVote,
  classifySeverity,
  aggregateBySector,
} from "@/modules/signalement/domain";
import {
  getExternalResources,
  analyzeHealthTrend,
} from "@/modules/health/domain";
import {
  calculateMedian,
  calculateStdDev,
} from "@/modules/observatory/domain";
import { calculateComplexityScore } from "@/utils/scoring";
import type { DiagnosticInput, HealthScore } from "@/types";

describe("Diagnostic Domain - Conditional Fields", () => {
  it("should hide nombreProceduresRH for small companies", () => {
    const fields = getVisibleFields({
      effectif: 3,
      statutJuridique: "EI",
      caAnnuel: 50000,
      nombrePlateformes: 1,
    });

    expect(fields.has("nombreProceduresRH")).toBe(false);
  });

  it("should show nombreProceduresRH for companies > 10 employees", () => {
    const fields = getVisibleFields({
      effectif: 15,
      statutJuridique: "SARL",
      caAnnuel: 500000,
      nombrePlateformes: 5,
    });

    expect(fields.has("nombreProceduresRH")).toBe(true);
  });

  it("should show coutConformite for SA/SAS/SARL", () => {
    const fields = getVisibleFields({
      effectif: 5,
      statutJuridique: "SAS",
      caAnnuel: 200000,
      nombrePlateformes: 3,
    });

    expect(fields.has("coutConformite")).toBe(true);
  });

  it("should show coutConformite for high CA even if micro-entreprise", () => {
    const fields = getVisibleFields({
      effectif: 1,
      statutJuridique: "Micro-entreprise",
      caAnnuel: 200000,
      nombrePlateformes: 2,
    });

    expect(fields.has("coutConformite")).toBe(true);
  });
});

describe("Diagnostic Domain - Recommendations", () => {
  it("should generate high-priority recommendation for high fiscal score", () => {
    const input: DiagnosticInput = {
      effectif: 50,
      secteur: "Industrie",
      caAnnuel: 2000000,
      statutJuridique: "SA",
      region: "Grand Est",
      nombreDeclarations: 40,
      tempsMensuelFiscal: 60,
      coutConformite: 150000,
      nombreProceduresRH: 20,
      nombreInterlocuteurs: 15,
      scoreDifficultePercue: 9,
      tempsAdminHebdo: 35,
      nombrePlateformes: 10,
      doubleSaisie: true,
    };

    const score = calculateComplexityScore(input);
    const recs = generateRecommendations(score, input);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].priority).toBe("high");
  });

  it("should include double-saisie recommendation when applicable", () => {
    const input: DiagnosticInput = {
      effectif: 10,
      secteur: "Commerce",
      caAnnuel: 500000,
      statutJuridique: "SARL",
      region: "Bretagne",
      nombreDeclarations: 10,
      tempsMensuelFiscal: 15,
      coutConformite: 8000,
      nombreProceduresRH: 5,
      nombreInterlocuteurs: 5,
      scoreDifficultePercue: 5,
      tempsAdminHebdo: 10,
      nombrePlateformes: 5,
      doubleSaisie: true,
    };

    const score = calculateComplexityScore(input);
    const recs = generateRecommendations(score, input);

    expect(recs.some((r) => r.title.includes("doubles saisies"))).toBe(true);
  });
});

describe("Signalement Domain", () => {
  it("should recalculate severity after adding a vote", () => {
    const signalement = {
      estimatedTimeLoss: 100,
      estimatedCost: 20000,
      votesCount: 50,
    };

    const result = recalculateSeverityAfterVote(signalement, true);
    expect(result.newVotesCount).toBe(51);
    expect(result.newSeverityScore).toBeGreaterThan(0);
  });

  it("should recalculate severity after removing a vote", () => {
    const signalement = {
      estimatedTimeLoss: 100,
      estimatedCost: 20000,
      votesCount: 50,
    };

    const result = recalculateSeverityAfterVote(signalement, false);
    expect(result.newVotesCount).toBe(49);
  });

  it("should classify severity levels correctly", () => {
    expect(classifySeverity(10)).toBe("faible");
    expect(classifySeverity(35)).toBe("modéré");
    expect(classifySeverity(60)).toBe("élevé");
    expect(classifySeverity(90)).toBe("critique");
  });

  it("should aggregate signalements by sector", () => {
    const signalements = [
      { sector: "Commerce", severityScore: 50, estimatedTimeLoss: 100, estimatedCost: 10000 },
      { sector: "Commerce", severityScore: 60, estimatedTimeLoss: 200, estimatedCost: 20000 },
      { sector: "BTP", severityScore: 40, estimatedTimeLoss: 50, estimatedCost: 5000 },
    ];

    const result = aggregateBySector(signalements);
    expect(result).toHaveLength(2);

    const commerce = result.find((r) => r.sector === "Commerce");
    expect(commerce?.count).toBe(2);
    expect(commerce?.avgSeverity).toBe(55);
    expect(commerce?.totalTimeLoss).toBe(300);
  });
});

describe("Health Domain", () => {
  it("should provide helpline for alert scores", () => {
    const alertScore: HealthScore = {
      score: 85,
      isAlert: true,
      recommendations: ["ALERTE"],
    };

    const resources = getExternalResources(alertScore);
    expect(resources.some((r) => r.type === "helpline")).toBe(true);
    expect(resources.some((r) => r.phone?.includes("0 805"))).toBe(true);
  });

  it("should not provide helpline for normal scores", () => {
    const normalScore: HealthScore = {
      score: 30,
      isAlert: false,
      recommendations: [],
    };

    const resources = getExternalResources(normalScore);
    expect(resources.some((r) => r.type === "helpline")).toBe(false);
  });

  it("should detect degrading health trend", () => {
    const history = [
      { score: 40, createdAt: new Date("2024-01-01") },
      { score: 65, createdAt: new Date("2024-04-01") },
    ];

    const trend = analyzeHealthTrend(history);
    expect(trend?.direction).toBe("degrading");
  });

  it("should detect improving health trend", () => {
    const history = [
      { score: 70, createdAt: new Date("2024-01-01") },
      { score: 40, createdAt: new Date("2024-04-01") },
    ];

    const trend = analyzeHealthTrend(history);
    expect(trend?.direction).toBe("improving");
  });

  it("should return null for insufficient history", () => {
    const trend = analyzeHealthTrend([{ score: 50, createdAt: new Date() }]);
    expect(trend).toBeNull();
  });
});

describe("Observatory Domain - Statistics", () => {
  it("should calculate median correctly for odd array", () => {
    expect(calculateMedian([1, 3, 5])).toBe(3);
  });

  it("should calculate median correctly for even array", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("should calculate standard deviation", () => {
    const stdDev = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stdDev).toBeCloseTo(2, 0);
  });

  it("should handle empty arrays", () => {
    expect(calculateMedian([])).toBe(0);
    expect(calculateStdDev([])).toBe(0);
  });
});
