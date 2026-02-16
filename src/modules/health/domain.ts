/**
 * Domain Module: Santé du Dirigeant
 *
 * Centralizes all business logic for the health assessment domain:
 * - SSD scoring
 * - Alert detection
 * - Resource recommendations
 * - Trend analysis
 */

import type { HealthInput, HealthScore } from "@/types";
import { calculateHealthScore } from "@/utils/scoring";

// --- Score Computation ---

export function computeHealthScore(data: HealthInput): HealthScore {
  return calculateHealthScore(data);
}

// --- External Resources ---

export interface ExternalResource {
  name: string;
  description: string;
  phone?: string;
  url?: string;
  type: "helpline" | "association" | "professional" | "information";
}

export function getExternalResources(score: HealthScore): ExternalResource[] {
  const resources: ExternalResource[] = [];

  if (score.isAlert) {
    resources.push({
      name: "Ligne d'écoute Entrepreneurs",
      description:
        "Service gratuit et confidentiel d'écoute pour les dirigeants en difficulté.",
      phone: "0 805 65 50 50",
      type: "helpline",
    });
    resources.push({
      name: "APESA - Aide Psychologique aux Entrepreneurs en Souffrance",
      description:
        "Dispositif de prise en charge psychologique d'urgence pour les dirigeants.",
      phone: "0 805 65 50 50",
      type: "association",
    });
  }

  if (score.score > 50) {
    resources.push({
      name: "Réseau Entreprendre",
      description:
        "Accompagnement par des chefs d'entreprise bénévoles. Rompt l'isolement.",
      type: "association",
    });
    resources.push({
      name: "CCI - Accompagnement dirigeant",
      description:
        "Votre Chambre de Commerce propose des dispositifs de soutien aux dirigeants.",
      type: "professional",
    });
  }

  resources.push({
    name: "Bpifrance - Santé du Dirigeant",
    description:
      "Ressources et guides pour préserver votre santé en tant que dirigeant.",
    type: "information",
  });

  return resources;
}

// --- Trend Analysis ---

export interface HealthTrend {
  direction: "improving" | "stable" | "degrading";
  changePercent: number;
  message: string;
}

export function analyzeHealthTrend(
  history: { score: number; createdAt: Date }[]
): HealthTrend | null {
  if (history.length < 2) return null;

  const sorted = [...history].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const latest = sorted[0].score;
  const previous = sorted[1].score;
  const change = latest - previous;
  const changePercent =
    previous !== 0 ? Math.round((change / previous) * 100) : 0;

  if (Math.abs(changePercent) < 5) {
    return {
      direction: "stable",
      changePercent: 0,
      message: "Votre score est stable par rapport à la dernière évaluation.",
    };
  }

  // For health score, higher = worse, so positive change = degrading
  if (change > 0) {
    return {
      direction: "degrading",
      changePercent,
      message: `Votre score s'est dégradé de ${Math.abs(changePercent)}% depuis la dernière évaluation. Soyez vigilant.`,
    };
  }

  return {
    direction: "improving",
    changePercent: Math.abs(changePercent),
    message: `Votre score s'est amélioré de ${Math.abs(changePercent)}%. Continuez vos efforts.`,
  };
}
