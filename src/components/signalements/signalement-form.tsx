"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  "Tous secteurs",
];

export function SignalementForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      estimatedTimeLoss: parseFloat(formData.get("estimatedTimeLoss") as string) || 0,
      estimatedCost: parseFloat(formData.get("estimatedCost") as string) || 0,
      level: formData.get("level") as string,
      sector: formData.get("sector") as string,
    };

    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Erreur lors de la création");
        return;
      }

      onSuccess?.();
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau signalement</CardTitle>
        <CardDescription>
          Signalez une norme ou procédure qui freine votre activité
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Titre du signalement</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Obligation de déclaration X trop fréquente"
              required
              minLength={5}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description détaillée</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Décrivez le problème, son impact sur votre activité..."
              required
              minLength={20}
              maxLength={5000}
              rows={5}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedTimeLoss">
                Temps perdu estimé (heures/an)
              </Label>
              <Input
                id="estimatedTimeLoss"
                name="estimatedTimeLoss"
                type="number"
                min={0}
                step="0.5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Coût estimé (EUR/an)</Label>
              <Input
                id="estimatedCost"
                name="estimatedCost"
                type="number"
                min={0}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="level">Niveau</Label>
              <select
                id="level"
                name="level"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="LOCAL">Local</option>
                <option value="NATIONAL">National</option>
                <option value="EU">Européen</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Secteur concerné</Label>
              <select
                id="sector"
                name="sector"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionnez</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Envoi..." : "Soumettre le signalement"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
