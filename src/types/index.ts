import type {
  User,
  Adherent,
  Cotisation,
  CotisationBareme,
  Mandat,
  MandatAssignment,
  MandatReport,
  Ticket,
  Instance,
  Convocation,
  Emargement,
  VoteSession,
} from "@prisma/client";

export type {
  User,
  Adherent,
  Cotisation,
  CotisationBareme,
  Mandat,
  MandatAssignment,
  MandatReport,
  Ticket,
  Instance,
  Convocation,
  Emargement,
  VoteSession,
};

export type AdherentWithUser = Adherent & {
  user: Pick<User, "id" | "email" | "name" | "role">;
};

export type AdherentFull = Adherent & {
  user: Pick<User, "id" | "email" | "name" | "role">;
  cotisations: Cotisation[];
  mandatAssignments: (MandatAssignment & {
    mandat: Mandat;
  })[];
};

export type CotisationWithAdherent = Cotisation & {
  adherent: Adherent & {
    user: Pick<User, "name" | "email">;
  };
};

export type ElectoralEntry = {
  id: string;
  companyName: string;
  userName: string;
  email: string;
  secteur: string;
  type: string;
  memberSince: Date;
  cotisationStatus: string;
  canVote: boolean;
};

export type DashboardStats = {
  totalAdherents: number;
  adherentsActifs: number;
  cotisationsPayees: number;
  cotisationsEnAttente: number;
  cotisationsEnRetard: number;
  totalRecettes: number;
  tauxRecouvrement: number;
  mandatsActifs: number;
  ticketsOuverts: number;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};
