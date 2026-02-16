import dynamic from "next/dynamic";

const EntrepreneurDashboard = dynamic(
  () =>
    import("@/components/dashboard/entrepreneur-dashboard").then(
      (mod) => mod.EntrepreneurDashboard
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    ),
    ssr: false,
  }
);

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tableau de Bord
        </h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de votre complexité administrative et de votre
          bien-être.
        </p>
      </div>
      <EntrepreneurDashboard />
    </div>
  );
}
