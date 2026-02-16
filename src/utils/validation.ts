import { z } from "zod";

// Sanitize string input to prevent XSS
function sanitizeString(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const sanitizedString = z.string().transform(sanitizeString);

// --- Auth Schemas ---

export const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir une majuscule, une minuscule et un chiffre"
    ),
  name: sanitizedString.pipe(
    z.string().min(2, "Le nom doit contenir au moins 2 caractères")
  ),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Le consentement RGPD est obligatoire" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

// --- Company Schema ---

export const companySchema = z.object({
  name: sanitizedString.pipe(z.string().min(1, "Nom de l'entreprise requis")),
  sector: z.string().min(1, "Secteur requis"),
  effectif: z.number().int().min(1, "L'effectif doit être supérieur à 0"),
  caAnnuel: z.number().min(0, "Le CA doit être positif"),
  statutJuridique: z.string().min(1, "Statut juridique requis"),
  region: z.string().min(1, "Région requise"),
});

// --- Diagnostic Schema ---

export const diagnosticSchema = z.object({
  effectif: z.number().int().min(1),
  secteur: z.string().min(1),
  caAnnuel: z.number().min(0),
  statutJuridique: z.string().min(1),
  region: z.string().min(1),

  nombreDeclarations: z.number().int().min(0).max(200),
  tempsMensuelFiscal: z.number().min(0).max(744),
  coutConformite: z.number().min(0),

  nombreProceduresRH: z.number().int().min(0).max(100),
  nombreInterlocuteurs: z.number().int().min(0).max(50),
  scoreDifficultePercue: z.number().min(1).max(10),

  tempsAdminHebdo: z.number().min(0).max(168),
  nombrePlateformes: z.number().int().min(0).max(50),
  doubleSaisie: z.boolean(),
});

// --- Signalement Schema ---

export const signalementSchema = z.object({
  title: sanitizedString.pipe(
    z
      .string()
      .min(5, "Le titre doit contenir au moins 5 caractères")
      .max(200, "Le titre ne doit pas dépasser 200 caractères")
  ),
  description: sanitizedString.pipe(
    z
      .string()
      .min(20, "La description doit contenir au moins 20 caractères")
      .max(5000, "La description ne doit pas dépasser 5000 caractères")
  ),
  estimatedTimeLoss: z
    .number()
    .min(0, "Le temps perdu doit être positif")
    .max(10000),
  estimatedCost: z
    .number()
    .min(0, "Le coût doit être positif")
    .max(10000000),
  level: z.enum(["LOCAL", "NATIONAL", "EU"]),
  sector: z.string().min(1, "Secteur requis"),
});

// --- Health Assessment Schema ---

export const healthSchema = z.object({
  fatigueMentale: z.number().int().min(1).max(10),
  chargeEmotionnelle: z.number().int().min(1).max(10),
  isolement: z.number().int().min(1).max(10),
  difficulteDecisionnelle: z.number().int().min(1).max(10),
});

// --- Pagination Schema ---

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type DiagnosticInputSchema = z.infer<typeof diagnosticSchema>;
export type SignalementInputSchema = z.infer<typeof signalementSchema>;
export type HealthInputSchema = z.infer<typeof healthSchema>;
