"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  CreditCard,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  Zap,
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
import { canManageCotisations } from "@/types/rbac";
import type { Role } from "@prisma/client";
import type { CotisationWithAdherent } from "@/types";
import { formatEuros, formatDate } from "@/utils/cotisation";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "En attente",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    icon: Clock,
  },
  PAID: {
    label: "Payée",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: "En retard",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
    icon: AlertTriangle,
  },
  SUSPENDED: {
    label: "Suspendue",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    icon: Clock,
  },
};

export default function CotisationsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [cotisations, setCotisations] = useState<CotisationWithAdherent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const fetchCotisations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cotisations?year=${year}`);
      if (!res.ok) throw new Error("Erreur lors du chargement des cotisations");
      const data = await res.json();
      setCotisations(data.data ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchCotisations();
  }, [fetchCotisations]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const dueDate = `${year}-03-31`;
      const res = await fetch("/api/cotisations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, dueDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }
      setShowConfirm(false);
      await fetchCotisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(cotisationId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/cotisations/${cotisationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
      setActionMenuId(null);
      await fetchCotisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  const totalAttendu = cotisations.reduce((sum, c) => sum + c.amount, 0);
  const totalEncaisse = cotisations
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0);
  const enAttente = cotisations.filter((c) => c.status === "PENDING").length;
  const enRetard = cotisations.filter((c) => c.status === "OVERDUE").length;

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Cotisations
          </h1>
          <p className="text-muted-foreground">
            Suivi et gestion des appels de cotisation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {userRole && canManageCotisations(userRole) && (
            <Button onClick={() => setShowConfirm(true)}>
              <Zap className="mr-2 h-4 w-4" />
              Générer les appels
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">
              Confirmer la génération des appels
            </CardTitle>
            <CardDescription>
              Cette action va générer les appels de cotisation pour l&apos;année{" "}
              {year} pour tous les adhérents actifs. Date d&apos;échéance par
              défaut : 31 mars {year}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                "Confirmer"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={generating}
            >
              Annuler
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total attendu
            </CardTitle>
            <div className="rounded-md bg-blue-50 p-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEuros(totalAttendu)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total encaissé
            </CardTitle>
            <div className="rounded-md bg-green-50 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatEuros(totalEncaisse)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <div className="rounded-md bg-yellow-50 p-2">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {enAttente}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <div className="rounded-md bg-red-50 p-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{enRetard}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5" />
            Cotisations {year} ({cotisations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cotisations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucune cotisation pour l&apos;année {year}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Entreprise</th>
                    <th className="pb-3 pr-4 font-medium">Contact</th>
                    <th className="pb-3 pr-4 font-medium">Montant</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="pb-3 pr-4 font-medium">Date échéance</th>
                    <th className="pb-3 pr-4 font-medium">Date paiement</th>
                    {userRole && canManageCotisations(userRole) && (
                      <th className="pb-3 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cotisations.map((cot) => {
                    const statusConf =
                      STATUS_CONFIG[cot.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr
                        key={cot.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {cot.adherent.companyName}
                        </td>
                        <td className="py-3 pr-4">
                          <div>{cot.adherent.user.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {cot.adherent.user.email}
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatEuros(cot.amount)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={statusConf.className}>
                            {statusConf.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {formatDate(cot.dueDate)}
                        </td>
                        <td className="py-3 pr-4">
                          {cot.paidAt ? formatDate(cot.paidAt) : "-"}
                        </td>
                        {userRole && canManageCotisations(userRole) && (
                          <td className="py-3">
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setActionMenuId(
                                    actionMenuId === cot.id ? null : cot.id
                                  )
                                }
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              {actionMenuId === cot.id && (
                                <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
                                  <div className="py-1">
                                    {cot.status !== "PAID" && (
                                      <button
                                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                                        onClick={() =>
                                          handleStatusChange(cot.id, "PAID")
                                        }
                                      >
                                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                        Marquer payée
                                      </button>
                                    )}
                                    {cot.status !== "OVERDUE" && (
                                      <button
                                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                                        onClick={() =>
                                          handleStatusChange(cot.id, "OVERDUE")
                                        }
                                      >
                                        <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                                        Marquer en retard
                                      </button>
                                    )}
                                    {cot.status !== "SUSPENDED" && (
                                      <button
                                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                                        onClick={() =>
                                          handleStatusChange(
                                            cot.id,
                                            "SUSPENDED"
                                          )
                                        }
                                      >
                                        <Clock className="mr-2 h-4 w-4 text-gray-600" />
                                        Suspendre
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
