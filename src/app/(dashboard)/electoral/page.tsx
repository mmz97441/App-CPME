"use client";

import { useEffect, useState } from "react";
import {
  Vote,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
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
import type { ElectoralEntry } from "@/types";
import { formatDate } from "@/utils/cotisation";

type FilterMode = "all" | "eligible" | "ineligible";

const COTISATION_STATUS_LABELS: Record<string, string> = {
  PAID: "Payée",
  PENDING: "En attente",
  OVERDUE: "En retard",
  SUSPENDED: "Suspendue",
};

export default function ElectoralPage() {
  const [entries, setEntries] = useState<ElectoralEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    async function fetchElectoral() {
      try {
        const res = await fetch("/api/electoral");
        if (!res.ok)
          throw new Error("Erreur lors du chargement de la liste électorale");
        const data = await res.json();
        setEntries(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchElectoral();
  }, []);

  const eligible = entries.filter((e) => e.canVote);
  const ineligible = entries.filter((e) => !e.canVote);

  const filtered =
    filter === "eligible"
      ? eligible
      : filter === "ineligible"
        ? ineligible
        : entries;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Liste Électorale
          </h1>
          <p className="text-muted-foreground">
            {eligible.length} adhérents éligibles sur {entries.length} au total
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => alert("Export PDF à venir")}
        >
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total adhérents
            </CardTitle>
            <div className="rounded-md bg-blue-50 p-2">
              <Vote className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éligibles</CardTitle>
            <div className="rounded-md bg-green-50 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {eligible.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Non éligibles
            </CardTitle>
            <div className="rounded-md bg-red-50 p-2">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {ineligible.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtre :</span>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tous ({entries.length})
          </Button>
          <Button
            variant={filter === "eligible" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("eligible")}
          >
            Éligibles ({eligible.length})
          </Button>
          <Button
            variant={filter === "ineligible" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("ineligible")}
          >
            Non éligibles ({ineligible.length})
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Vote className="h-5 w-5" />
            Liste ({filtered.length})
          </CardTitle>
          <CardDescription>
            Adhérents avec leur droit de vote pour l&apos;assemblée générale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucun adhérent trouvé pour ce filtre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Entreprise</th>
                    <th className="pb-3 pr-4 font-medium">Représentant</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Secteur</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Membre depuis</th>
                    <th className="pb-3 pr-4 font-medium">Cotisation</th>
                    <th className="pb-3 font-medium">Droit de vote</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {entry.companyName}
                      </td>
                      <td className="py-3 pr-4">{entry.userName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {entry.email}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{entry.secteur}</Badge>
                      </td>
                      <td className="py-3 pr-4">{entry.type}</td>
                      <td className="py-3 pr-4">
                        {formatDate(entry.memberSince)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          className={
                            entry.cotisationStatus === "PAID"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : entry.cotisationStatus === "OVERDUE"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }
                        >
                          {COTISATION_STATUS_LABELS[entry.cotisationStatus] ||
                            entry.cotisationStatus}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {entry.canVote ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
