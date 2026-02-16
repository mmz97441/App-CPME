"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthResult {
  assessment: { id: string; score: number };
  isAlert: boolean;
  recommendations: string[];
}

export function HealthForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HealthResult | null>(null);
  const [formData, setFormData] = useState({
    fatigueMentale: 5,
    chargeEmotionnelle: 5,
    isolement: 5,
    difficulteDecisionnelle: 5,
  });

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/health-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'évaluation");
        return;
      }

      setResult(data.data);
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card className={result.isAlert ? "border-red-500" : ""}>
          <CardHeader>
            <CardTitle
              className={result.isAlert ? "text-red-600" : ""}
            >
              Score Santé Dirigeant : {result.assessment.score.toFixed(1)} / 100
            </CardTitle>
            <CardDescription>
              {result.isAlert
                ? "Votre score dépasse le seuil d'alerte (70/100)"
                : "Votre score est dans une zone acceptable"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`rounded-md p-3 text-sm ${
                  rec.startsWith("ALERTE")
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                {rec}
              </div>
            ))}
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => setResult(null)}>
          Refaire l&apos;évaluation
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évaluation Santé Dirigeant</CardTitle>
        <CardDescription>
          Ce questionnaire confidentiel évalue votre bien-être. Les données
          restent strictement personnelles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Label>
            Fatigue mentale ({formData.fatigueMentale}/10)
          </Label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[formData.fatigueMentale]}
            onValueChange={([val]) =>
              setFormData((p) => ({ ...p, fatigueMentale: val }))
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Peu fatigué</span>
            <span>Épuisé</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>
            Charge émotionnelle ({formData.chargeEmotionnelle}/10)
          </Label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[formData.chargeEmotionnelle]}
            onValueChange={([val]) =>
              setFormData((p) => ({ ...p, chargeEmotionnelle: val }))
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Serein</span>
            <span>Submergé</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Isolement ({formData.isolement}/10)</Label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[formData.isolement]}
            onValueChange={([val]) =>
              setFormData((p) => ({ ...p, isolement: val }))
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Bien entouré</span>
            <span>Très isolé</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label>
            Difficulté décisionnelle (
            {formData.difficulteDecisionnelle}/10)
          </Label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[formData.difficulteDecisionnelle]}
            onValueChange={([val]) =>
              setFormData((p) => ({ ...p, difficulteDecisionnelle: val }))
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Décisions faciles</span>
            <span>Paralysé</span>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Évaluation..." : "Obtenir mon score"}
        </Button>
      </CardContent>
    </Card>
  );
}
