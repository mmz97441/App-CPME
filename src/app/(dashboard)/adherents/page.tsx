"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  Search,
  Plus,
  Star,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { canManageAdherents } from "@/types/rbac";
import type { Role } from "@prisma/client";
import type { AdherentWithUser } from "@/types";

const SECTEUR_OPTIONS = [
  { value: "", label: "Tous les secteurs" },
  { value: "COMMERCE", label: "Commerce" },
  { value: "INDUSTRIE", label: "Industrie" },
  { value: "SERVICES", label: "Services" },
  { value: "BTP", label: "BTP" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "DIRECT", label: "Direct" },
  { value: "FEDERATION", label: "Fédération" },
  { value: "SYNDICAT", label: "Syndicat" },
];

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

export default function AdherentsPage() {
  const { data: session } = useSession();
  const [adherents, setAdherents] = useState<AdherentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [secteurFilter, setSecteurFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const userRole = session?.user?.role as Role | undefined;

  useEffect(() => {
    async function fetchAdherents() {
      try {
        const res = await fetch("/api/adherents");
        if (!res.ok) throw new Error("Erreur lors du chargement des adhérents");
        const data = await res.json();
        setAdherents(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchAdherents();
  }, []);

  const filtered = adherents.filter((a) => {
    const matchSearch =
      search === "" ||
      a.companyName.toLowerCase().includes(search.toLowerCase()) ||
      a.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.user.email.toLowerCase().includes(search.toLowerCase());
    const matchSecteur = secteurFilter === "" || a.secteur === secteurFilter;
    const matchType = typeFilter === "" || a.type === typeFilter;
    return matchSearch && matchSecteur && matchType;
  });

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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Adhérents
          </h1>
          <Badge variant="secondary" className="text-sm">
            {adherents.length}
          </Badge>
        </div>
        {userRole && canManageAdherents(userRole) && (
          <Link href="/adherents/nouveau">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Adhérent
            </Button>
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par entreprise, contact ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={secteurFilter}
              onChange={(e) => setSecteurFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {SECTEUR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Liste des adhérents ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucun adhérent trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Entreprise</th>
                    <th className="pb-3 pr-4 font-medium">Contact</th>
                    <th className="pb-3 pr-4 font-medium">Secteur</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Effectif</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="pb-3 font-medium">VIP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((adherent) => (
                    <tr
                      key={adherent.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/adherents/${adherent.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {adherent.companyName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{adherent.user.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {adherent.user.email}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">
                          {SECTEUR_LABELS[adherent.secteur] || adherent.secteur}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {TYPE_LABELS[adherent.type] || adherent.type}
                      </td>
                      <td className="py-3 pr-4">{adherent.effectif}</td>
                      <td className="py-3 pr-4">
                        {adherent.isActive ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inactif</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {adherent.isVIP && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            <Star className="mr-1 h-3 w-3" />
                            VIP
                          </Badge>
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
