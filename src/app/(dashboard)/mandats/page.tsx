"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Plus,
  Loader2,
  Briefcase,
  Users,
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
import { canManageMandats } from "@/types/rbac";
import type { Role } from "@prisma/client";

interface MandatAssignment {
  id: string;
  status: string;
  adherent: {
    id: string;
    companyName: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
  };
}

interface MandatWithAssignments {
  id: string;
  name: string;
  organisme: string;
  classification: "STRATEGIQUE" | "TECHNIQUE";
  description: string | null;
  feuilleDeRoute: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignments: MandatAssignment[];
}

const CLASSIFICATION_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "STRATEGIQUE", label: "Stratégique" },
  { value: "TECHNIQUE", label: "Technique" },
];

export default function MandatsPage() {
  const { data: session } = useSession();
  const [mandats, setMandats] = useState<MandatWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");

  // New mandat form
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMandat, setNewMandat] = useState({
    name: "",
    organisme: "",
    classification: "STRATEGIQUE" as "STRATEGIQUE" | "TECHNIQUE",
    description: "",
    feuilleDeRoute: "",
  });

  const userRole = session?.user?.role as Role | undefined;

  useEffect(() => {
    async function fetchMandats() {
      try {
        const params = new URLSearchParams();
        if (classificationFilter) {
          params.set("classification", classificationFilter);
        }

        const url = `/api/mandats${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erreur lors du chargement des mandats");
        const data = await res.json();
        setMandats(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchMandats();
  }, [classificationFilter]);

  async function handleCreateMandat() {
    if (!newMandat.name.trim() || !newMandat.organisme.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/mandats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMandat),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }
      setNewMandat({ name: "", organisme: "", classification: "STRATEGIQUE", description: "", feuilleDeRoute: "" });
      setShowForm(false);
      // Re-fetch
      const fetchRes = await fetch(`/api/mandats${classificationFilter ? `?classification=${classificationFilter}` : ""}`);
      if (fetchRes.ok) {
        const fetchData = await fetchRes.json();
        setMandats(fetchData.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  const filtered = mandats.filter((m) => {
    if (search === "") return true;
    const term = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      m.organisme.toLowerCase().includes(term) ||
      (m.description && m.description.toLowerCase().includes(term))
    );
  });

  const getActiveAssignmentCount = (mandat: MandatWithAssignments): number => {
    return mandat.assignments.filter((a) => a.status === "ACTIVE").length;
  };

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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Mandats
          </h1>
          <Badge variant="secondary" className="text-sm">
            {mandats.length}
          </Badge>
        </div>
        {userRole && canManageMandats(userRole) && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau mandat
          </Button>
        )}
      </div>

      {/* New mandat form */}
      {showForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Créer un nouveau mandat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nom du mandat *</label>
                <Input
                  value={newMandat.name}
                  onChange={(e) => setNewMandat({ ...newMandat, name: e.target.value })}
                  placeholder="Ex: Représentant CGSS"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Organisme *</label>
                <Input
                  value={newMandat.organisme}
                  onChange={(e) => setNewMandat({ ...newMandat, organisme: e.target.value })}
                  placeholder="Ex: CGSS Réunion"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Classification</label>
                <select
                  value={newMandat.classification}
                  onChange={(e) => setNewMandat({ ...newMandat, classification: e.target.value as "STRATEGIQUE" | "TECHNIQUE" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="STRATEGIQUE">Stratégique</option>
                  <option value="TECHNIQUE">Technique</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Input
                  value={newMandat.description}
                  onChange={(e) => setNewMandat({ ...newMandat, description: e.target.value })}
                  placeholder="Description du mandat..."
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Feuille de route</label>
              <textarea
                value={newMandat.feuilleDeRoute}
                onChange={(e) => setNewMandat({ ...newMandat, feuilleDeRoute: e.target.value })}
                placeholder="Points clés que le mandataire doit défendre..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateMandat} disabled={creating || !newMandat.name.trim() || !newMandat.organisme.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le mandat"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={creating}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, organisme ou description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Mandats list */}
      <div>
        <div className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Briefcase className="h-5 w-5" />
          Liste des mandats ({filtered.length})
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun mandat trouvé.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((mandat) => {
              const activeCount = getActiveAssignmentCount(mandat);
              return (
                <Card key={mandat.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">
                        {mandat.name}
                      </CardTitle>
                      <Badge
                        className={
                          mandat.classification === "STRATEGIQUE"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        }
                      >
                        {mandat.classification === "STRATEGIQUE"
                          ? "Stratégique"
                          : "Technique"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="text-muted-foreground">
                        {mandat.organisme}
                      </div>
                      {mandat.description && (
                        <p className="line-clamp-2 text-muted-foreground">
                          {mandat.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 pt-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {activeCount} assignation{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {!mandat.isActive && (
                        <Badge variant="destructive" className="mt-2">
                          Inactif
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
