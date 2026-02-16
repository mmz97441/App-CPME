import dynamic from "next/dynamic";

const ObservatoryDashboard = dynamic(
  () =>
    import("@/components/observatory/observatory-dashboard").then(
      (mod) => mod.ObservatoryDashboard
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement du tableau de bord...</div>
      </div>
    ),
    ssr: false,
  }
);

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
