"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const SECTORS = [
  "Commerce",
  "BTP",
  "Industrie",
  "Services",
  "Artisanat",
  "Agriculture",
  "Numérique",
  "Santé",
  "Transport",
  "Restauration",
  "Autre",
];

const REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "DOM-TOM",
];

const STATUTS = [
  "SARL",
  "SAS",
  "SASU",
  "EURL",
  "SA",
  "EI",
  "Micro-entreprise",
  "SCI",
  "Autre",
];

interface DiagnosticFormData {
  effectif: number;
  secteur: string;
  caAnnuel: number;
  statutJuridique: string;
  region: string;
  nombreDeclarations: number;
  tempsMensuelFiscal: number;
  coutConformite: number;
  nombreProceduresRH: number;
  nombreInterlocuteurs: number;
  scoreDifficultePercue: number;
  tempsAdminHebdo: number;
  nombrePlateformes: number;
  doubleSaisie: boolean;
}

const STEPS = [
  "Profil entreprise",
  "Complexité fiscale",
  "Complexité sociale",
  "Complexité administrative",
];

export function DiagnosticForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<DiagnosticFormData>({
    effectif: 1,
    secteur: "",
    caAnnuel: 0,
    statutJuridique: "",
    region: "",
    nombreDeclarations: 0,
    tempsMensuelFiscal: 0,
    coutConformite: 0,
    nombreProceduresRH: 0,
    nombreInterlocuteurs: 0,
    scoreDifficultePercue: 5,
    tempsAdminHebdo: 0,
    nombrePlateformes: 0,
    doubleSaisie: false,
  });

  function updateField<K extends keyof DiagnosticFormData>(
    field: K,
    value: DiagnosticFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Erreur lors de la soumission");
        return;
      }

      router.push(`/dashboard?diagnostic=${result.data.diagnostic.id}`);
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Étape {step + 1} / {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Profil de votre entreprise</CardTitle>
            <CardDescription>
              Informations générales sur votre structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Effectif (nombre de salariés)</Label>
              <Input
                type="number"
                min={1}
                value={formData.effectif}
                onChange={(e) =>
                  updateField("effectif", parseInt(e.target.value) || 1)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Secteur d&apos;activité</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.secteur}
                onChange={(e) => updateField("secteur", e.target.value)}
              >
                <option value="">Sélectionnez un secteur</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Chiffre d&apos;affaires annuel (EUR)</Label>
              <Input
                type="number"
                min={0}
                value={formData.caAnnuel}
                onChange={(e) =>
                  updateField("caAnnuel", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Statut juridique</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.statutJuridique}
                onChange={(e) =>
                  updateField("statutJuridique", e.target.value)
                }
              >
                <option value="">Sélectionnez un statut</option>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Région</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.region}
                onChange={(e) => updateField("region", e.target.value)}
              >
                <option value="">Sélectionnez une région</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Complexité fiscale</CardTitle>
            <CardDescription>
              Évaluez la charge liée à vos obligations fiscales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de déclarations fiscales par an</Label>
              <Input
                type="number"
                min={0}
                value={formData.nombreDeclarations}
                onChange={(e) =>
                  updateField(
                    "nombreDeclarations",
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Temps mensuel consacré à la fiscalité (heures)</Label>
              <Input
                type="number"
                min={0}
                value={formData.tempsMensuelFiscal}
                onChange={(e) =>
                  updateField(
                    "tempsMensuelFiscal",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Coût annuel de conformité fiscale (EUR - expert-comptable,
                logiciels, etc.)
              </Label>
              <Input
                type="number"
                min={0}
                value={formData.coutConformite}
                onChange={(e) =>
                  updateField(
                    "coutConformite",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Complexité sociale</CardTitle>
            <CardDescription>
              Évaluez la charge liée à la gestion RH et sociale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de procédures RH gérées par an</Label>
              <Input
                type="number"
                min={0}
                value={formData.nombreProceduresRH}
                onChange={(e) =>
                  updateField(
                    "nombreProceduresRH",
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre d&apos;interlocuteurs administratifs différents</Label>
              <Input
                type="number"
                min={0}
                value={formData.nombreInterlocuteurs}
                onChange={(e) =>
                  updateField(
                    "nombreInterlocuteurs",
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Difficulté perçue ({formData.scoreDifficultePercue}/10)
              </Label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[formData.scoreDifficultePercue]}
                onValueChange={([val]) =>
                  updateField("scoreDifficultePercue", val)
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Facile</span>
                <span>Très difficile</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Complexité administrative</CardTitle>
            <CardDescription>
              Évaluez la charge administrative générale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Temps administratif hebdomadaire (heures)</Label>
              <Input
                type="number"
                min={0}
                value={formData.tempsAdminHebdo}
                onChange={(e) =>
                  updateField(
                    "tempsAdminHebdo",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre de plateformes administratives utilisées</Label>
              <Input
                type="number"
                min={0}
                value={formData.nombrePlateformes}
                onChange={(e) =>
                  updateField(
                    "nombrePlateformes",
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="doubleSaisie"
                checked={formData.doubleSaisie}
                onChange={(e) =>
                  updateField("doubleSaisie", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="doubleSaisie">
                Effectuez-vous des doubles saisies de données ?
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Précédent
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Suivant</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Envoi en cours..." : "Soumettre le diagnostic"}
          </Button>
        )}
      </div>
    </div>
  );
}
