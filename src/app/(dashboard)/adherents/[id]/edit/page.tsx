"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCotisationAmount,
  getCotisationLabel,
  formatEuros,
} from "@/utils/cotisation";
import { canManageAdherents } from "@/types/rbac";
import type { Role } from "@prisma/client";
import type { AdherentFull } from "@/types";

const SECTEUR_OPTIONS = [
  { value: "COMMERCE", label: "Commerce" },
  { value: "INDUSTRIE", label: "Industrie" },
  { value: "SERVICES", label: "Services" },
  { value: "BTP", label: "BTP" },
];

const TYPE_OPTIONS = [
  { value: "DIRECT", label: "Direct" },
  { value: "FEDERATION", label: "Fédération" },
  { value: "SYNDICAT", label: "Syndicat" },
];

export default function EditAdherentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const id = params.id as string;

  const userRole = session?.user?.role as Role | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    email: "",
    name: "",
    companyName: "",
    siret: "",
    secteur: "COMMERCE",
    type: "DIRECT",
    effectif: 0,
    caAnnuel: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
    isVIP: false,
    isActive: true,
  });

  useEffect(() => {
    async function fetchAdherent() {
      try {
        const res = await fetch(`/api/adherents/${id}`);
        if (!res.ok) throw new Error("Erreur lors du chargement");
        const json = await res.json();
        const data: AdherentFull = json.data ?? json;
        setForm({
          email: data.user.email,
          name: data.user.name || "",
          companyName: data.companyName,
          siret: data.siret || "",
          secteur: data.secteur,
          type: data.type,
          effectif: data.effectif,
          caAnnuel: data.caAnnuel ? String(data.caAnnuel) : "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          postalCode: data.postalCode || "",
          notes: data.notes || "",
          isVIP: data.isVIP,
          isActive: data.isActive,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchAdherent();
  }, [id]);

  function updateField(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.email.trim()) errors.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Format d'email invalide";
    if (!form.name.trim()) errors.name = "Le nom du contact est requis";
    if (!form.companyName.trim())
      errors.companyName = "Le nom de l'entreprise est requis";
    if (!form.phone.trim()) errors.phone = "Le téléphone est requis";
    if (!form.address.trim()) errors.address = "L'adresse est requise";
    if (!form.city.trim()) errors.city = "La ville est requise";
    if (!form.postalCode.trim())
      errors.postalCode = "Le code postal est requis";
    if (Number(form.effectif) < 0)
      errors.effectif = "L'effectif doit être positif";
    if (form.siret && !/^\d{14}$/.test(form.siret.replace(/\s/g, "")))
      errors.siret = "Le SIRET doit contenir 14 chiffres";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const body = {
        email: form.email,
        name: form.name,
        companyName: form.companyName,
        siret: form.siret || null,
        secteur: form.secteur,
        type: form.type,
        effectif: Number(form.effectif),
        caAnnuel: form.caAnnuel ? Number(form.caAnnuel) : null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        postalCode: form.postalCode || null,
        notes: form.notes || null,
        isVIP: form.isVIP,
        isActive: form.isActive,
      };

      const res = await fetch(`/api/adherents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      router.push(`/adherents/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  const cotisationAmount = getCotisationAmount(Number(form.effectif) || 0);
  const cotisationLabel = getCotisationLabel(Number(form.effectif) || 0);

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userRole || !canManageAdherents(userRole)) {
    return (
      <div className="space-y-4">
        <Link href="/adherents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Vous n&apos;avez pas les permissions pour modifier un adhérent.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/adherents/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier l&apos;adhérent
          </h1>
          <p className="text-muted-foreground">{form.companyName}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Informations de contact
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom du contact *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-destructive">{fieldErrors.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Informations entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l&apos;entreprise *</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-destructive">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={form.siret}
                onChange={(e) => updateField("siret", e.target.value)}
              />
              {fieldErrors.siret && (
                <p className="text-xs text-destructive">{fieldErrors.siret}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secteur">Secteur *</Label>
              <select
                id="secteur"
                value={form.secteur}
                onChange={(e) => updateField("secteur", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {SECTEUR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectif">Effectif *</Label>
              <Input
                id="effectif"
                type="number"
                min={0}
                value={form.effectif}
                onChange={(e) => updateField("effectif", parseInt(e.target.value) || 0)}
              />
              {fieldErrors.effectif && (
                <p className="text-xs text-destructive">
                  {fieldErrors.effectif}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="caAnnuel">CA Annuel</Label>
              <Input
                id="caAnnuel"
                type="number"
                min={0}
                value={form.caAnnuel}
                onChange={(e) => updateField("caAnnuel", e.target.value)}
                placeholder="En euros"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cotisation preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotisation estimée</CardTitle>
            <CardDescription>
              Montant calculé selon le barème en vigueur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatEuros(cotisationAmount)}
              </span>
              <span className="text-sm text-muted-foreground">
                / an - {cotisationLabel}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adresse</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
              {fieldErrors.address && (
                <p className="text-xs text-destructive">
                  {fieldErrors.address}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal *</Label>
              <Input
                id="postalCode"
                value={form.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
              />
              {fieldErrors.postalCode && (
                <p className="text-xs text-destructive">
                  {fieldErrors.postalCode}
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="city">Ville *</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
              {fieldErrors.city && (
                <p className="text-xs text-destructive">{fieldErrors.city}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Informations complémentaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Notes internes sur cet adhérent..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <input
                  id="isVIP"
                  type="checkbox"
                  checked={form.isVIP}
                  onChange={(e) => updateField("isVIP", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isVIP" className="cursor-pointer">
                  Marquer comme VIP
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Adhérent actif
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Link href={`/adherents/${id}`}>
              <Button variant="outline" type="button">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
