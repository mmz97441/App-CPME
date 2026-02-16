/**
 * Domain Module: Signalement Normatif
 *
 * Centralizes all business logic for the signalement domain:
 * - Severity scoring
 * - Vote management
 * - Filtering & sorting
 * - Data aggregation
 */

import type { SeverityScoreInput } from "@/types";
import { calculateSeverityScore } from "@/utils/scoring";

// --- Severity Score ---

export function computeSeverityScore(data: SeverityScoreInput): number {
  return calculateSeverityScore(data);
}

/**
 * Recalculate severity score after a vote change.
 */
export function recalculateSeverityAfterVote(
  signalement: {
    estimatedTimeLoss: number;
    estimatedCost: number;
    votesCount: number;
  },
  voteAdded: boolean
): { newVotesCount: number; newSeverityScore: number } {
  const newVotesCount = voteAdded
    ? signalement.votesCount + 1
    : signalement.votesCount - 1;

  const newSeverityScore = computeSeverityScore({
    estimatedTimeLoss: signalement.estimatedTimeLoss,
    estimatedCost: signalement.estimatedCost,
    votesCount: newVotesCount,
  });

  return { newVotesCount, newSeverityScore };
}

// --- Severity Level Classification ---

export type SeverityLevel = "faible" | "modéré" | "élevé" | "critique";

export function classifySeverity(score: number): SeverityLevel {
  if (score <= 25) return "faible";
  if (score <= 50) return "modéré";
  if (score <= 75) return "élevé";
  return "critique";
}

// --- Aggregation ---

export interface SectorAggregation {
  sector: string;
  count: number;
  avgSeverity: number;
  totalTimeLoss: number;
  totalCost: number;
}

export function aggregateBySector(
  signalements: {
    sector: string;
    severityScore: number;
    estimatedTimeLoss: number;
    estimatedCost: number;
  }[]
): SectorAggregation[] {
  const map = new Map<
    string,
    { count: number; totalSeverity: number; totalTime: number; totalCost: number }
  >();

  for (const s of signalements) {
    const existing = map.get(s.sector) || {
      count: 0,
      totalSeverity: 0,
      totalTime: 0,
      totalCost: 0,
    };
    existing.count++;
    existing.totalSeverity += s.severityScore;
    existing.totalTime += s.estimatedTimeLoss;
    existing.totalCost += s.estimatedCost;
    map.set(s.sector, existing);
  }

  return Array.from(map.entries()).map(([sector, data]) => ({
    sector,
    count: data.count,
    avgSeverity: Math.round((data.totalSeverity / data.count) * 100) / 100,
    totalTimeLoss: data.totalTime,
    totalCost: data.totalCost,
  }));
}
