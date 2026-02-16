"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SECTORS = [
  "Commerce", "BTP", "Industrie", "Services", "Artisanat",
  "Agriculture", "Numérique", "Santé", "Transport", "Restauration", "Autre",
];

const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
  "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur", "DOM-TOM",
];

const STATUTS = [
  "SARL", "SAS", "SASU", "EURL", "SA", "EI", "Micro-entreprise", "SCI", "Autre",
];

interface CompanyData {
  name: string;
  sector: string;
  effectif: number;
  caAnnuel: number;
  statutJuridique: string;
  region: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    role: string;
    createdAt: string;
  } | null>(null);
  const [company, setCompany] = useState<CompanyData>({
    name: "",
    sector: "",
    effectif: 1,
    caAnnuel: 0,
    statutJuridique: "",
    region: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (data.success && data.data) {
        setUserData({
          name: data.data.name || "",
          email: data.data.email,
          role: data.data.role,
          createdAt: data.data.createdAt,
        });
        if (data.data.company) {
          setCompany(data.data.company);
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la sauvegarde");
      } else {
        setSuccess("Profil entreprise mis à jour avec succès");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    try {
      const res = await fetch("/api/users/me/delete", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/?deleted=true";
      }
    } catch {
      setError("Erreur lors de la suppression");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et votre profil entreprise.
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nom</span>
            <span>{userData?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{userData?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rôle</span>
            <span>{userData?.role}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Inscrit le</span>
            <span>
              {userData?.createdAt
                ? new Date(userData.createdAt).toLocaleDateString("fr-FR")
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profil Entreprise</CardTitle>
          <CardDescription>
            Ces informations sont utilisées pour votre diagnostic et les
            comparaisons régionales/sectorielles.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveCompany}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
              <Input
                id="companyName"
                value={company.name}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Secteur d&apos;activité</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={company.sector}
                  onChange={(e) =>
                    setCompany((c) => ({ ...c, sector: e.target.value }))
                  }
                  required
                >
                  <option value="">Sélectionnez</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Statut juridique</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={company.statutJuridique}
                  onChange={(e) =>
                    setCompany((c) => ({
                      ...c,
                      statutJuridique: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Sélectionnez</option>
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Effectif (salariés)</Label>
                <Input
                  type="number"
                  min={1}
                  value={company.effectif}
                  onChange={(e) =>
                    setCompany((c) => ({
                      ...c,
                      effectif: parseInt(e.target.value) || 1,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CA annuel (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={company.caAnnuel}
                  onChange={(e) =>
                    setCompany((c) => ({
                      ...c,
                      caAnnuel: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Région</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={company.region}
                onChange={(e) =>
                  setCompany((c) => ({ ...c, region: e.target.value }))
                }
                required
              >
                <option value="">Sélectionnez</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Sauvegarde..." : "Enregistrer le profil"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* GDPR Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            Données personnelles (RGPD)
          </CardTitle>
          <CardDescription>
            Conformément au RGPD, vous pouvez exporter ou supprimer l&apos;intégralité
            de vos données.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() =>
                window.open("/api/users/me/export?format=json", "_blank")
              }
            >
              Exporter mes données (JSON)
            </Button>
          </div>
          <div className="border-t pt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              La suppression de votre compte est irréversible. Toutes vos
              données (diagnostics, signalements, évaluations santé) seront
              définitivement effacées.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
            >
              {deleteConfirm
                ? "Confirmer la suppression définitive"
                : "Supprimer mon compte"}
            </Button>
            {deleteConfirm && (
              <Button
                variant="ghost"
                className="ml-2"
                onClick={() => setDeleteConfirm(false)}
              >
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
