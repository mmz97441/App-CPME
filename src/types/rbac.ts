import type { Role } from "@prisma/client";

const ROLE_HIERARCHY: Role[] = [
  "ADHERENT",
  "MEMBRE_CA",
  "MEMBRE_BUREAU",
  "TRESORIER",
  "DELEGUE_GENERAL",
  "PRESIDENT",
  "ADMIN",
];

export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

export function canManageAdherents(role: Role): boolean {
  return hasMinRole(role, "DELEGUE_GENERAL");
}

export function canManageCotisations(role: Role): boolean {
  return hasMinRole(role, "TRESORIER");
}

export function canViewTresorerie(role: Role): boolean {
  return role === "TRESORIER" || role === "PRESIDENT" || role === "ADMIN";
}

export function canManageGouvernance(role: Role): boolean {
  return hasMinRole(role, "MEMBRE_BUREAU");
}

export function canManageMandats(role: Role): boolean {
  return hasMinRole(role, "DELEGUE_GENERAL");
}

export function canLiftSuspension(role: Role): boolean {
  return role === "PRESIDENT" || role === "ADMIN";
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canViewElectoralList(role: Role): boolean {
  return hasMinRole(role, "DELEGUE_GENERAL");
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur Système",
  PRESIDENT: "Président",
  DELEGUE_GENERAL: "Délégué Général",
  TRESORIER: "Trésorier",
  MEMBRE_BUREAU: "Membre du Bureau",
  MEMBRE_CA: "Membre du CA",
  ADHERENT: "Adhérent",
};
