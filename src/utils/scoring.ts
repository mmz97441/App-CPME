import type {
  DiagnosticInput,
  ComplexityScore,
  SeverityScoreInput,
  HealthInput,
  HealthScore,
} from "@/types";

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a value from a given range to 0-100.
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

/**
 * Calculate the ICG (Indice de Complexité Globale) from diagnostic data.
 *
 * ICG = (Temps admin hebdo × 0.3) + (Nombre déclarations × 0.2)
 *     + (Coût conformité / CA × 0.2) + (Score subjectif × 0.2)
 *     + (Nombre interlocuteurs × 0.1)
 *
 * All components are normalized to 0-100 before weighting.
 */
export function calculateComplexityScore(
  data: DiagnosticInput
): ComplexityScore {
  // Normalize each component to 0-100
  // Temps admin hebdo: 0-60 hours/week range
  const tempsAdminNorm = normalize(data.tempsAdminHebdo, 0, 60);

  // Nombre déclarations: 0-50 per year
  const declarationsNorm = normalize(data.nombreDeclarations, 0, 50);

  // Coût conformité / CA: ratio 0-0.1 (10% of revenue)
  const coutRatio = data.caAnnuel > 0 ? data.coutConformite / data.caAnnuel : 0;
  const coutConformiteNorm = normalize(coutRatio, 0, 0.1);

  // Score subjectif: already 1-10, normalize to 0-100
  const scoreSubjectifNorm = normalize(data.scoreDifficultePercue, 1, 10);

  // Nombre interlocuteurs: 0-20
  const interlocuteursNorm = normalize(data.nombreInterlocuteurs, 0, 20);

  // Apply weights
  const tempsAdminComponent = tempsAdminNorm * 0.3;
  const declarationsComponent = declarationsNorm * 0.2;
  const coutConformiteComponent = coutConformiteNorm * 0.2;
  const scoreSubjectifComponent = scoreSubjectifNorm * 0.2;
  const interlocuteursComponent = interlocuteursNorm * 0.1;

  const global = clamp(
    tempsAdminComponent +
      declarationsComponent +
      coutConformiteComponent +
      scoreSubjectifComponent +
      interlocuteursComponent,
    0,
    100
  );

  // Sub-scores by domain
  const fiscal = clamp(
    normalize(data.nombreDeclarations, 0, 50) * 0.4 +
      normalize(data.tempsMensuelFiscal, 0, 80) * 0.3 +
      coutConformiteNorm * 0.3,
    0,
    100
  );

  const social = clamp(
    normalize(data.nombreProceduresRH, 0, 30) * 0.3 +
      interlocuteursNorm * 0.3 +
      scoreSubjectifNorm * 0.4,
    0,
    100
  );

  const admin = clamp(
    tempsAdminNorm * 0.4 +
      normalize(data.nombrePlateformes, 0, 15) * 0.3 +
      (data.doubleSaisie ? 100 : 0) * 0.3,
    0,
    100
  );

  return {
    global: Math.round(global * 100) / 100,
    fiscal: Math.round(fiscal * 100) / 100,
    social: Math.round(social * 100) / 100,
    admin: Math.round(admin * 100) / 100,
    details: {
      tempsAdminComponent: Math.round(tempsAdminComponent * 100) / 100,
      declarationsComponent: Math.round(declarationsComponent * 100) / 100,
      coutConformiteComponent:
        Math.round(coutConformiteComponent * 100) / 100,
      scoreSubjectifComponent:
        Math.round(scoreSubjectifComponent * 100) / 100,
      interlocuteursComponent:
        Math.round(interlocuteursComponent * 100) / 100,
    },
  };
}

/**
 * Calculate severity score for a signalement.
 *
 * severityScore = (Temps perdu × 0.4) + (Coût estimé × 0.3) + (Nombre votes × 0.3)
 *
 * All components normalized to 0-100.
 */
export function calculateSeverityScore(data: SeverityScoreInput): number {
  // Time lost: 0-500 hours/year
  const timeLossNorm = normalize(data.estimatedTimeLoss, 0, 500);

  // Cost: 0-100000 EUR
  const costNorm = normalize(data.estimatedCost, 0, 100000);

  // Votes: 0-1000
  const votesNorm = normalize(data.votesCount, 0, 1000);

  const score = timeLossNorm * 0.4 + costNorm * 0.3 + votesNorm * 0.3;

  return Math.round(clamp(score, 0, 100) * 100) / 100;
}

/**
 * Calculate the SSD (Score Santé Dirigeant) from health assessment data.
 * Each dimension is 1-10, weighted equally.
 * Final score is normalized to 0-100.
 * If score > 70, an alert is triggered.
 */
export function calculateHealthScore(data: HealthInput): HealthScore {
  const avg =
    (data.fatigueMentale +
      data.chargeEmotionnelle +
      data.isolement +
      data.difficulteDecisionnelle) /
    4;

  const score = Math.round(normalize(avg, 1, 10) * 100) / 100;
  const isAlert = score > 70;

  const recommendations: string[] = [];

  if (data.fatigueMentale >= 7) {
    recommendations.push(
      "Votre niveau de fatigue mentale est élevé. Envisagez de consulter un professionnel de santé."
    );
  }
  if (data.chargeEmotionnelle >= 7) {
    recommendations.push(
      "Votre charge émotionnelle est importante. Des techniques de gestion du stress pourraient vous aider."
    );
  }
  if (data.isolement >= 7) {
    recommendations.push(
      "Vous ressentez un isolement significatif. Rejoindre un réseau d'entrepreneurs pourrait vous être bénéfique."
    );
  }
  if (data.difficulteDecisionnelle >= 7) {
    recommendations.push(
      "Vous éprouvez des difficultés décisionnelles. Un accompagnement par un coach ou mentor pourrait vous aider."
    );
  }
  if (isAlert) {
    recommendations.push(
      "ALERTE : Votre score global dépasse le seuil critique. Nous vous recommandons vivement de contacter un professionnel de santé."
    );
    recommendations.push(
      "Ligne d'écoute entrepreneurs : 0 805 65 50 50 (gratuit, confidentiel)"
    );
  }

  return { score, isAlert, recommendations };
}
