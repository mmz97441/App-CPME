import { ObservatoryDashboard } from "@/components/observatory/observatory-dashboard";

export default function ObservatoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Observatoire de la Simplification
        </h1>
        <p className="text-muted-foreground">
          Tableau de bord analytique : données agrégées sur la complexité
          administrative des PME françaises.
        </p>
      </div>
      <ObservatoryDashboard />
    </div>
  );
}
