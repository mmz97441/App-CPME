import { HealthForm } from "@/components/health/health-form";

export default function HealthPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Santé du Dirigeant
        </h1>
        <p className="text-muted-foreground">
          Évaluez votre bien-être et recevez des recommandations
          personnalisées. Vos données sont strictement confidentielles.
        </p>
      </div>
      <HealthForm />
    </div>
  );
}
