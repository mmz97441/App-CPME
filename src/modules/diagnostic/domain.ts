/**
 * Domain Module: Diagnostic Complexité PME
 *
 * Centralizes all business logic for the diagnostic domain:
 * - Scoring algorithms
 * - Conditional questionnaire logic
 * - Recommendation engine
 * - Data transformation
 */

import type { DiagnosticInput, ComplexityScore } from "@/types";
import { calculateComplexityScore } from "@/utils/scoring";

// --- Conditional Questionnaire Logic ---

export interface ConditionalRule {
  field: string;
  condition: (value: unknown) => boolean;
  showFields: string[];
}

/**
 * Conditional rules for the diagnostic questionnaire.
 * Determines which fields to show based on previous answers.
 */
export const CONDITIONAL_RULES: ConditionalRule[] = [
  {
    field: "effectif",
    condition: (value) => (value as number) > 10,
    showFields: ["nombreProceduresRH", "nombreInterlocuteurs"],
  },
  {
    field: "effectif",
    condition: (value) => (value as number) <= 10,
    showFields: ["scoreDifficultePercue"],
  },
  {
    field: "statutJuridique",
    condition: (value) =>
      ["SA", "SAS", "SARL"].includes(value as string),
    showFields: ["nombreDeclarations", "coutConformite"],
  },
  {
    field: "statutJuridique",
    condition: (value) => (value as string) === "Micro-entreprise",
    showFields: ["tempsMensuelFiscal"],
  },
  {
    field: "caAnnuel",
    condition: (value) => (value as number) > 100000,
    showFields: ["coutConformite"],
  },
  {
    field: "doubleSaisie",
    condition: (value) => value === true,
    showFields: ["nombrePlateformes"],
  },
];

/**
 * Determine which fields should be visible based on current form data.
 */
export function getVisibleFields(
  formData: Partial<DiagnosticInput>
): Set<string> {
  // Base fields always visible
  const visible = new Set([
    "effectif",
    "secteur",
    "caAnnuel",
    "statutJuridique",
    "region",
    "tempsAdminHebdo",
    "doubleSaisie",
    "scoreDifficultePercue",
    "tempsMensuelFiscal",
    "nombreDeclarations",
  ]);

  for (const rule of CONDITIONAL_RULES) {
    const value = formData[rule.field as keyof DiagnosticInput];
    if (value !== undefined && rule.condition(value)) {
      for (const field of rule.showFields) {
        visible.add(field);
      }
    }
  }

  return visible;
}

/**
 * Get default values for hidden fields (ensures scoring works even with hidden fields).
 */
export function getDefaultsForHiddenFields(
  formData: Partial<DiagnosticInput>,
  visibleFields: Set<string>
): Partial<DiagnosticInput> {
  const defaults: Partial<DiagnosticInput> = {};

  if (!visibleFields.has("nombreProceduresRH")) {
    defaults.nombreProceduresRH = 0;
  }
  if (!visibleFields.has("nombreInterlocuteurs")) {
    defaults.nombreInterlocuteurs = 1;
  }
  if (!visibleFields.has("coutConformite")) {
    defaults.coutConformite = 0;
  }
  if (!visibleFields.has("nombrePlateformes")) {
    defaults.nombrePlateformes = (formData.nombrePlateformes as number) || 1;
  }

  return defaults;
}

// --- Scoring Delegation ---

export function computeDiagnosticScore(data: DiagnosticInput): ComplexityScore {
  return calculateComplexityScore(data);
}

// --- Recommendation Engine ---

export interface Recommendation {
  priority: "high" | "medium" | "low";
  domain: "fiscal" | "social" | "admin" | "general";
  title: string;
  description: string;
  estimatedImpact: string;
}

export function generateRecommendations(
  score: ComplexityScore,
  input: DiagnosticInput
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (score.fiscal > 60) {
    recs.push({
      priority: "high",
      domain: "fiscal",
      title: "Urgence simplification fiscale",
      description:
        "Votre score fiscal est critique. Envisagez un audit complet de vos obligations déclaratives avec un expert-comptable spécialisé PME.",
      estimatedImpact: "Réduction potentielle de 30% du temps fiscal",
    });
  } else if (score.fiscal > 40) {
    recs.push({
      priority: "medium",
      domain: "fiscal",
      title: "Optimisation fiscale recommandée",
      description:
        "Regroupez vos déclarations quand c'est possible. Utilisez un logiciel de comptabilité avec télétransmission intégrée.",
      estimatedImpact: "Réduction potentielle de 15% du temps fiscal",
    });
  }

  if (score.social > 60) {
    recs.push({
      priority: "high",
      domain: "social",
      title: "Simplification des procédures RH urgente",
      description:
        "Centralisez vos interlocuteurs sociaux. Envisagez un service de paie externalisé ou un SIRH adapté PME.",
      estimatedImpact: "Réduction de 40% des procédures RH redondantes",
    });
  }

  if (score.admin > 60) {
    recs.push({
      priority: "high",
      domain: "admin",
      title: "Transformation numérique administrative",
      description:
        "Votre charge administrative est excessive. Priorisez l'élimination des doubles saisies et l'interconnexion de vos plateformes.",
      estimatedImpact: `Économie estimée : ${Math.round(input.tempsAdminHebdo * 0.3 * 52)}h/an`,
    });
  }

  if (input.doubleSaisie) {
    recs.push({
      priority: "medium",
      domain: "admin",
      title: "Élimination des doubles saisies",
      description:
        "Les doubles saisies sont un indicateur clé de complexité évitable. Investissez dans des solutions intégrées ou des API entre vos outils.",
      estimatedImpact: "Réduction de 20-40% du temps administratif",
    });
  }

  if (input.nombreInterlocuteurs > 10) {
    recs.push({
      priority: "medium",
      domain: "social",
      title: "Réduction des interlocuteurs",
      description:
        "Vous interagissez avec trop d'interlocuteurs administratifs. Identifiez un guichet unique ou un intermédiaire centralisateur.",
      estimatedImpact: "Simplification des échanges et gain de temps",
    });
  }

  if (recs.length === 0) {
    recs.push({
      priority: "low",
      domain: "general",
      title: "Maintien de l'efficacité",
      description:
        "Votre gestion administrative est bien optimisée. Restez vigilant face aux évolutions réglementaires.",
      estimatedImpact: "Maintien de votre niveau d'efficacité actuel",
    });
  }

  return recs.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// --- Data Transformation ---

export function diagnosticToExport(
  diagnostic: {
    id: string;
    complexityScore: number;
    fiscalScore: number;
    socialScore: number;
    adminScore: number;
    createdAt: Date;
    rawAnswers: unknown;
  },
  company: { name: string; sector: string; region: string }
) {
  return {
    id: diagnostic.id,
    entreprise: company.name,
    secteur: company.sector,
    region: company.region,
    scoreGlobal: diagnostic.complexityScore,
    scoreFiscal: diagnostic.fiscalScore,
    scoreSocial: diagnostic.socialScore,
    scoreAdmin: diagnostic.adminScore,
    date: diagnostic.createdAt.toISOString(),
  };
}
