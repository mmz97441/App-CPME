/**
 * Domain Module: Observatoire Data
 *
 * Centralizes all business logic for the observatory domain:
 * - Data aggregation
 * - Statistical analysis
 * - Reporting
 */

import type { RegionalData, SectorData, TrendData } from "@/types";

// --- Statistical Analysis ---

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

// --- National Summary ---

export interface NationalSummary {
  totalDiagnostics: number;
  totalSignalements: number;
  averageComplexityScore: number;
  medianComplexityScore: number;
  stdDevComplexityScore: number;
  topRegion: { name: string; score: number } | null;
  topSector: { name: string; score: number } | null;
  trendDirection: "improving" | "stable" | "degrading";
}

export function computeNationalSummary(
  diagnosticScores: number[],
  regionalData: RegionalData[],
  sectorData: SectorData[],
  trendData: TrendData[]
): NationalSummary {
  const avg =
    diagnosticScores.length > 0
      ? diagnosticScores.reduce((sum, v) => sum + v, 0) /
        diagnosticScores.length
      : 0;

  const topRegion =
    regionalData.length > 0
      ? regionalData.reduce((max, r) =>
          r.avgScore > max.avgScore ? r : max
        )
      : null;

  const topSector =
    sectorData.length > 0
      ? sectorData.reduce((max, s) =>
          s.avgScore > max.avgScore ? s : max
        )
      : null;

  // Determine trend
  let trendDirection: "improving" | "stable" | "degrading" = "stable";
  if (trendData.length >= 2) {
    const recent = trendData[trendData.length - 1].avgScore;
    const previous = trendData[trendData.length - 2].avgScore;
    const change = recent - previous;
    if (change > 3) trendDirection = "degrading";
    else if (change < -3) trendDirection = "improving";
  }

  return {
    totalDiagnostics: diagnosticScores.length,
    totalSignalements: 0, // filled by caller
    averageComplexityScore: Math.round(avg * 100) / 100,
    medianComplexityScore: Math.round(calculateMedian(diagnosticScores) * 100) / 100,
    stdDevComplexityScore: Math.round(calculateStdDev(diagnosticScores) * 100) / 100,
    topRegion: topRegion
      ? { name: topRegion.region, score: topRegion.avgScore }
      : null,
    topSector: topSector
      ? { name: topSector.sector, score: topSector.avgScore }
      : null,
    trendDirection,
  };
}

// --- Comparative Analysis ---

export interface ComparisonResult {
  userScore: number;
  regionAvg: number;
  sectorAvg: number;
  nationalAvg: number;
  percentileRegion: number;
  percentileSector: number;
  percentileNational: number;
}

export function compareToAverages(
  userScore: number,
  allScores: number[],
  regionScores: number[],
  sectorScores: number[]
): ComparisonResult {
  function percentile(scores: number[], value: number): number {
    if (scores.length === 0) return 50;
    const below = scores.filter((s) => s < value).length;
    return Math.round((below / scores.length) * 100);
  }

  function average(scores: number[]): number {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  return {
    userScore,
    regionAvg: Math.round(average(regionScores) * 100) / 100,
    sectorAvg: Math.round(average(sectorScores) * 100) / 100,
    nationalAvg: Math.round(average(allScores) * 100) / 100,
    percentileRegion: percentile(regionScores, userScore),
    percentileSector: percentile(sectorScores, userScore),
    percentileNational: percentile(allScores, userScore),
  };
}
