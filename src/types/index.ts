import { Role, SignalementLevel } from "@prisma/client";

// --- Diagnostic Types ---

export interface DiagnosticInput {
  // Profil entreprise
  effectif: number;
  secteur: string;
  caAnnuel: number;
  statutJuridique: string;
  region: string;

  // Complexité fiscale
  nombreDeclarations: number;
  tempsMensuelFiscal: number;
  coutConformite: number;

  // Complexité sociale
  nombreProceduresRH: number;
  nombreInterlocuteurs: number;
  scoreDifficultePercue: number;

  // Complexité administrative
  tempsAdminHebdo: number;
  nombrePlateformes: number;
  doubleSaisie: boolean;
}

export interface ComplexityScore {
  global: number;
  fiscal: number;
  social: number;
  admin: number;
  details: {
    tempsAdminComponent: number;
    declarationsComponent: number;
    coutConformiteComponent: number;
    scoreSubjectifComponent: number;
    interlocuteursComponent: number;
  };
}

// --- Signalement Types ---

export interface SignalementInput {
  title: string;
  description: string;
  estimatedTimeLoss: number;
  estimatedCost: number;
  level: SignalementLevel;
  sector: string;
}

export interface SeverityScoreInput {
  estimatedTimeLoss: number;
  estimatedCost: number;
  votesCount: number;
}

// --- Health Types ---

export interface HealthInput {
  fatigueMentale: number;
  chargeEmotionnelle: number;
  isolement: number;
  difficulteDecisionnelle: number;
}

export interface HealthScore {
  score: number;
  isAlert: boolean;
  recommendations: string[];
}

// --- RBAC Types ---

export type Permission =
  | "diagnostic:create"
  | "diagnostic:read"
  | "diagnostic:read:all"
  | "signalement:create"
  | "signalement:read"
  | "signalement:read:all"
  | "signalement:moderate"
  | "signalement:vote"
  | "health:create"
  | "health:read"
  | "observatory:read"
  | "admin:users"
  | "admin:audit"
  | "export:pdf";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ENTREPRENEUR: [
    "diagnostic:create",
    "diagnostic:read",
    "signalement:create",
    "signalement:read",
    "signalement:vote",
    "health:create",
    "health:read",
    "export:pdf",
  ],
  ADMIN: [
    "diagnostic:create",
    "diagnostic:read",
    "diagnostic:read:all",
    "signalement:create",
    "signalement:read",
    "signalement:read:all",
    "signalement:moderate",
    "signalement:vote",
    "health:create",
    "health:read",
    "observatory:read",
    "admin:users",
    "admin:audit",
    "export:pdf",
  ],
  ANALYSTE: [
    "diagnostic:read:all",
    "signalement:read:all",
    "observatory:read",
    "export:pdf",
  ],
  MODERATEUR: [
    "signalement:read:all",
    "signalement:moderate",
    "observatory:read",
  ],
  INSTITUTION: [
    "diagnostic:read:all",
    "signalement:read:all",
    "observatory:read",
    "export:pdf",
  ],
  DATA_VIEW_ONLY: ["observatory:read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// --- API Response Types ---

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// --- Observatory Types ---

export interface RegionalData {
  region: string;
  avgScore: number;
  count: number;
}

export interface SectorData {
  sector: string;
  avgScore: number;
  count: number;
}

export interface TrendData {
  period: string;
  avgScore: number;
  count: number;
}

export interface TopIrritant {
  id: string;
  title: string;
  severityScore: number;
  votesCount: number;
  sector: string;
  level: SignalementLevel;
}
