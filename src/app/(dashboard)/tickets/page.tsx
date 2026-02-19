"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  Plus,
  Search,
  Ticket,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TicketUser {
  id: string;
  name: string | null;
  email: string;
}

interface TicketAdherent {
  id: string;
  companyName: string;
  siret: string | null;
}

interface TicketData {
  id: string;
  category: string;
  subject: string;
  status: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
  adherent: TicketAdherent | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  JURIDIQUE: {
    label: "Juridique",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  PRESSE: {
    label: "Presse",
    className: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  },
  COTISATION: {
    label: "Cotisation",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  AUTRE: {
    label: "Autre",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  OUVERT: {
    label: "Ouvert",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    icon: AlertCircle,
  },
  EN_COURS: {
    label: "En cours",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    icon: Clock,
  },
  RESOLU: {
    label: "Résolu",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
    icon: CheckCircle2,
  },
  FERME: {
    label: "Fermé",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    icon: XCircle,
  },
};

const STATUS_FILTERS = [
  { value: "", label: "Tous" },
  { value: "OUVERT", label: "Ouvert" },
  { value: "EN_COURS", label: "En cours" },
  { value: "RESOLU", label: "Résolu" },
  { value: "FERME", label: "Fermé" },
];

const CATEGORY_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "JURIDIQUE", label: "Juridique" },
  { value: "PRESSE", label: "Presse" },
  { value: "COTISATION", label: "Cotisation" },
  { value: "AUTRE", label: "Autre" },
];

const CATEGORY_OPTIONS = [
  { value: "JURIDIQUE", label: "Juridique" },
  { value: "PRESSE", label: "Presse" },
  { value: "COTISATION", label: "Cotisation" },
  { value: "AUTRE", label: "Autre" },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // New ticket form
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState("AUTRE");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  // ----------- Fetch tickets ------------------------------------------------

  const fetchTickets = useCallback(async () => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/tickets?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Erreur lors du chargement des tickets");
      const json = await res.json();
      setTickets(json.data ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, debouncedSearch]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ----------- Create ticket ------------------------------------------------

  async function handleCreate() {
    if (!newSubject.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory, subject: newSubject }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }
      setNewSubject("");
      setNewCategory("AUTRE");
      setShowForm(false);
      await fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  // ----------- Summary counts -----------------------------------------------

  const countByStatus = (s: string) => tickets.filter((t) => t.status === s).length;
  const openCount = countByStatus("OUVERT");
  const inProgressCount = countByStatus("EN_COURS");
  const resolvedCount = countByStatus("RESOLU");
  const closedCount = countByStatus("FERME");

  // ----------- Helpers -------------------------------------------------------

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // ----------- Render --------------------------------------------------------

  if (loading && tickets.length === 0) {
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
            Tickets / Support
          </h1>
          <p className="text-muted-foreground">
            Gestion des demandes et du support
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau ticket
        </Button>
      </div>

      {/* New ticket form */}
      {showForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Créer un nouveau ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Catégorie
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Sujet</label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Décrivez votre demande..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={creating || !newSubject.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le ticket"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={creating}
              >
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

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ouverts</CardTitle>
            <div className="rounded-md bg-blue-50 p-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <div className="rounded-md bg-amber-50 p-2">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {inProgressCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Résolus</CardTitle>
            <div className="rounded-md bg-green-50 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {resolvedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fermés</CardTitle>
            <div className="rounded-md bg-gray-50 p-2">
              <XCircle className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {closedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Statut :
              </span>
              <div className="flex gap-1">
                {STATUS_FILTERS.map((sf) => (
                  <Button
                    key={sf.value}
                    variant={statusFilter === sf.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(sf.value)}
                  >
                    {sf.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Catégorie :
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CATEGORY_FILTERS.map((cf) => (
                  <option key={cf.value} value={cf.value}>
                    {cf.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative ml-auto w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-5 w-5" />
            Tickets ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>Aucun ticket trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Sujet</th>
                    <th className="pb-3 pr-4 font-medium">Catégorie</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="pb-3 pr-4 font-medium">Créé par</th>
                    <th className="pb-3 pr-4 font-medium">Assigné à</th>
                    <th className="pb-3 pr-4 font-medium">Priorité</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const catConf =
                      CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.AUTRE;
                    const statusConf =
                      STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OUVERT;
                    const StatusIcon = statusConf.icon;

                    return (
                      <tr
                        key={ticket.id}
                        className="border-b last:border-0 transition-colors hover:bg-muted/50"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {ticket.subject}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={catConf.className}>
                            {catConf.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={statusConf.className}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div>{ticket.createdBy.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {ticket.createdBy.email}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {ticket.assignedTo ? (
                            <div>
                              <div>{ticket.assignedTo.name || "-"}</div>
                              <div className="text-xs text-muted-foreground">
                                {ticket.assignedTo.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              ticket.priority >= 2
                                ? "font-semibold text-red-600"
                                : ticket.priority === 1
                                ? "font-medium text-amber-600"
                                : "text-muted-foreground"
                            }
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {formatDate(ticket.createdAt)}
                        </td>
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
