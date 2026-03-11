import { z } from "zod";

export const adherentSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
  siret: z
    .string()
    .regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres")
    .optional()
    .or(z.literal("")),
  secteur: z.enum(["COMMERCE", "INDUSTRIE", "SERVICES", "BTP"]),
  type: z.enum(["DIRECT", "FEDERATION", "SYNDICAT"]),
  effectif: z.number().int().min(0, "L'effectif doit être positif"),
  caAnnuel: z.number().min(0).optional(),
  isVIP: z.boolean().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

export type AdherentFormData = z.infer<typeof adherentSchema>;

export const cotisationSchema = z.object({
  adherentId: z.string().cuid(),
  year: z.number().int().min(2020).max(2100),
  amount: z.number().positive("Le montant doit être positif"),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional(),
});

export const generateCotisationsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(2, "Le nom est requis"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum([
    "ADMIN",
    "PRESIDENT",
    "DELEGUE_GENERAL",
    "TRESORIER",
    "MEMBRE_BUREAU",
    "MEMBRE_CA",
    "ADHERENT",
  ]),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});
