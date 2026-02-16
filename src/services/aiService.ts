import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Classify a signalement into a category automatically.
 */
export async function classifySignalement(
  title: string,
  description: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en classification de signalements administratifs pour les PME françaises.
          Classe le signalement dans une des catégories suivantes :
          - FISCAL: Obligations fiscales et déclaratives
          - SOCIAL: Droit du travail et obligations sociales
          - ADMINISTRATIF: Procédures administratives générales
          - REGLEMENTAIRE: Normes et réglementations sectorielles
          - NUMERIQUE: Obligations numériques et RGPD
          - ENVIRONNEMENTAL: Normes environnementales
          Réponds uniquement avec le nom de la catégorie.`,
        },
        {
          role: "user",
          content: `Titre: ${title}\nDescription: ${description}`,
        },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    return response.choices[0]?.message?.content?.trim() || "ADMINISTRATIF";
  } catch (error) {
    console.error("AI classification error:", error);
    return "ADMINISTRATIF"; // fallback
  }
}

/**
 * Generate a summary of a signalement description.
 */
export async function summarizeDescription(
  description: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Résume le signalement suivant en 2-3 phrases concises, en français. Mets en avant l'impact principal sur l'activité de l'entreprise.",
        },
        {
          role: "user",
          content: description,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || description;
  } catch (error) {
    console.error("AI summarization error:", error);
    return description; // fallback to original
  }
}

/**
 * Detect potential duplicate signalements.
 */
export async function detectDuplicates(
  newTitle: string,
  newDescription: string,
  existingSignalements: { id: string; title: string; description: string }[]
): Promise<string[]> {
  if (existingSignalements.length === 0) return [];

  try {
    const existingList = existingSignalements
      .slice(0, 20) // Limit to 20 for API constraints
      .map((s, i) => `[${i}] ${s.title}: ${s.description.slice(0, 100)}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un détecteur de doublons. Compare le nouveau signalement avec la liste existante.
          Retourne les indices (numéros entre crochets) des signalements similaires, séparés par des virgules.
          Si aucun doublon, réponds "AUCUN".`,
        },
        {
          role: "user",
          content: `Nouveau signalement:\nTitre: ${newTitle}\nDescription: ${newDescription}\n\nSignalements existants:\n${existingList}`,
        },
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.trim() || "AUCUN";

    if (result === "AUCUN") return [];

    const indices = result.match(/\d+/g);
    if (!indices) return [];

    return indices
      .map((i) => {
        const idx = parseInt(i);
        return existingSignalements[idx]?.id;
      })
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("AI duplicate detection error:", error);
    return [];
  }
}

/**
 * Generate a parliamentary synthesis note from observatory data.
 */
export async function generateParliamentarySynthesis(data: {
  averageScore: number;
  totalDiagnostics: number;
  topIrritants: { title: string; severityScore: number; votesCount: number }[];
  sectorData: { sector: string; avgScore: number; count: number }[];
}): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un rédacteur institutionnel expert. Génère une note de synthèse parlementaire
          sur l'impact de la complexité administrative sur les PME françaises.
          La note doit être formelle, factuelle et basée sur les données fournies.
          Structure: Contexte, Constats clés, Données chiffrées, Recommandations.`,
        },
        {
          role: "user",
          content: JSON.stringify(data),
        },
      ],
      max_tokens: 1000,
      temperature: 0.4,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      "Erreur lors de la génération de la synthèse."
    );
  } catch (error) {
    console.error("AI synthesis error:", error);
    return "La génération de la synthèse n'est pas disponible actuellement.";
  }
}
