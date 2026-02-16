"use client";

import { useState } from "react";
import { SignalementForm } from "@/components/signalements/signalement-form";
import { SignalementList } from "@/components/signalements/signalement-list";
import { Button } from "@/components/ui/button";

export default function SignalementsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Signalements</h1>
          <p className="text-muted-foreground">
            Signalez les normes et procédures qui freinent votre activité.
            Votez pour les plus impactantes.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Fermer" : "Nouveau signalement"}
        </Button>
      </div>

      {showForm && (
        <SignalementForm onSuccess={() => setShowForm(false)} />
      )}

      <SignalementList />
    </div>
  );
}
