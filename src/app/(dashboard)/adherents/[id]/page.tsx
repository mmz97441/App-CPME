"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Star,
  Pencil,
  User,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdherentFull } from "@/types";
import {
  formatEuros,
  formatDate,
  getCotisationLabel,
  getCotisationAmount,
} from "@/utils/cotisation";
import { canManageAdherents } from "@/types/rbac";
import type { Role } from "@prisma/client";

const SECTEUR_LABELS: Record<string, string> = {
  COMMERCE: "Commerce",
  INDUSTRIE: "Industrie",
  SERVICES: "Services",
  BTP: "BTP",
};

const TYPE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  FEDERATION: "Fédération",
  SYNDICAT: "Syndicat",
};

const COTISATION_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PAID: { label: "Payée", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  OVERDUE: { label: "En retard", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  SUSPENDED: { label: "Suspendue", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

export default function AdherentDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;
  const id = params.id as string;

  const [adherent, setAdherent] = useState<AdherentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAdherent() {
      try {
        const res = await fetch(`/api/adherents/${id}`);
        if (!res.ok) throw new Error("Erreur lors du chargement de la fiche");
        const data = await res.json();
        setAdherent(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchAdherent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/adherents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!adherent) return null;

  const sortedCotisations = [...(adherent.cotisations || [])].sort(
    (a, b) => b.year - a.year
  );

  const activeMandats = (adherent.mandatAssignments || []).filter(
    (ma) => ma.status === "ACTIVE"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/adherents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {adherent.companyName}
              </h1>
              {adherent.isVIP && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  <Star className="mr-1 h-3 w-3" />
                  VIP
                </Badge>
              )}
              {adherent.isActive ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  Actif
                </Badge>
              ) : (
                <Badge variant="destructive">Inactif</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Fiche 360° - {TYPE_LABELS[adherent.type] || adherent.type}
            </p>
          </div>
        </div>
        {userRole && canManageAdherents(userRole) && (
          <Link href={`/adherents/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
        )}
      </div>

      {/* Info grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Informations entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">SIRET</dt>
                <dd className="text-sm font-medium">
                  {adherent.siret || "Non renseigné"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Secteur</dt>
                <dd>
                  <Badge variant="outline">
                    {SECTEUR_LABELS[adherent.secteur] || adherent.secteur}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Type</dt>
                <dd className="text-sm font-medium">
                  {TYPE_LABELS[adherent.type] || adherent.type}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Effectif</dt>
                <dd className="text-sm font-medium">
                  {adherent.effectif} salariés
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">CA Annuel</dt>
                <dd className="text-sm font-medium">
                  {adherent.caAnnuel
                    ? formatEuros(adherent.caAnnuel)
                    : "Non renseigné"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">
                  Barème cotisation
                </dt>
                <dd className="text-sm font-medium">
                  {getCotisationLabel(adherent.effectif)} -{" "}
                  {formatEuros(getCotisationAmount(adherent.effectif))}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Nom</dt>
                <dd className="text-sm font-medium">
                  {adherent.user.name || "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="text-sm font-medium">{adherent.user.email}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <span className="ml-auto text-sm font-medium">
                  {adherent.phone || "Non renseigné"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Adresse</span>
                <span className="ml-auto text-right text-sm font-medium">
                  {adherent.address
                    ? `${adherent.address}, ${adherent.postalCode} ${adherent.city}`
                    : "Non renseignée"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Membre depuis
                </span>
                <span className="ml-auto text-sm font-medium">
                  {formatDate(adherent.memberSince)}
                </span>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {adherent.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {adherent.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cotisations timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Historique des cotisations
          </CardTitle>
          <CardDescription>
            Suivi des appels de cotisation par année
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedCotisations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune cotisation enregistrée.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedCotisations.map((cot) => {
                const statusConfig =
                  COTISATION_STATUS_CONFIG[cot.status] ||
                  COTISATION_STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={cot.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold">{cot.year}</span>
                      <Badge className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatEuros(cot.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Échéance : {formatDate(cot.dueDate)}
                        {cot.paidAt && ` | Payée le ${formatDate(cot.paidAt)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mandats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Mandats actifs
          </CardTitle>
          <CardDescription>
            Représentations et missions en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeMandats.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun mandat actif.
            </p>
          ) : (
            <div className="space-y-3">
              {activeMandats.map((ma) => (
                <div
                  key={ma.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{ma.mandat.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ma.mandat.organisme} -{" "}
                      {ma.mandat.classification === "STRATEGIQUE"
                        ? "Stratégique"
                        : "Technique"}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Depuis le {formatDate(ma.startDate)}
                    {ma.endDate && ` - Jusqu'au ${formatDate(ma.endDate)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
