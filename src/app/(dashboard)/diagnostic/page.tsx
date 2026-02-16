import { DiagnosticForm } from "@/components/diagnostic/diagnostic-form";

export default function DiagnosticPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Diagnostic Complexité PME
        </h1>
        <p className="text-muted-foreground">
          Évaluez l&apos;Indice de Complexité Globale (ICG) de votre entreprise à
          travers les dimensions fiscale, sociale et administrative.
        </p>
      </div>
      <DiagnosticForm />
    </div>
  );
}
