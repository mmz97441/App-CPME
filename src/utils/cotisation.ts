export const DEFAULT_BAREME = [
  { label: "Auto-entrepreneur (0 salarié)", effectifMin: 0, effectifMax: 0, amount: 150 },
  { label: "TPE (1-5 salariés)", effectifMin: 1, effectifMax: 5, amount: 250 },
  { label: "TPE (6-10 salariés)", effectifMin: 6, effectifMax: 10, amount: 500 },
  { label: "PME (11-50 salariés)", effectifMin: 11, effectifMax: 50, amount: 1000 },
  { label: "PME (51-200 salariés)", effectifMin: 51, effectifMax: 200, amount: 2000 },
  { label: "ETI (201-500 salariés)", effectifMin: 201, effectifMax: 500, amount: 3500 },
  { label: "ETI/GE (500+ salariés)", effectifMin: 501, effectifMax: 999999, amount: 5000 },
];

export function getCotisationAmount(effectif: number): number {
  const tranche = DEFAULT_BAREME.find(
    (b) => effectif >= b.effectifMin && effectif <= b.effectifMax
  );
  return tranche?.amount ?? 250;
}

export function getCotisationLabel(effectif: number): string {
  const tranche = DEFAULT_BAREME.find(
    (b) => effectif >= b.effectifMin && effectif <= b.effectifMax
  );
  return tranche?.label ?? "Non défini";
}

export function isOverdue(dueDate: Date): boolean {
  return new Date() > new Date(dueDate);
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
