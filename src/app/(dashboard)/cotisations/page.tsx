"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Pencil,
  X,
  Save,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canManageCotisations, canLiftSuspension } from "@/types/rbac";
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

// Valid transitions matching the API
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "OVERDUE", "SUSPENDED"],
  OVERDUE: ["PAID", "SUSPENDED"],
  PAID: [],
  SUSPENDED: ["PAID", "PENDING"],
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
  const [relancing, setRelancing] = useState(false);
  const [relanceResult, setRelanceResult] = useState<{
    newlyMarkedOverdue: number;
    totalOverdue: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Edit modal
  const [editingCotisation, setEditingCotisation] =
    useState<CotisationWithAdherent | null>(null);
  const [editForm, setEditForm] = useState({
    status: "",
    amount: "",
    dueDate: "",
    notes: "",
    invoiceRef: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Outside click handler for dropdown
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionMenuId(null);
      }
    }
    if (actionMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [actionMenuId]);

  const fetchCotisations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cotisations?year=${year}`);
      if (!res.ok)
        throw new Error("Erreur lors du chargement des cotisations");
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

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Quick status change (from dropdown)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Full edit modal
  // ---------------------------------------------------------------------------

  function openEdit(cot: CotisationWithAdherent) {
    setEditingCotisation(cot);
    setEditForm({
      status: cot.status,
      amount: String(cot.amount),
      dueDate: new Date(cot.dueDate).toISOString().split("T")[0],
      notes: cot.notes || "",
      invoiceRef: cot.invoiceRef || "",
    });
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editingCotisation) return;
    setSavingEdit(true);
    setEditError("");

    try {
      const body: Record<string, unknown> = {};

      const newAmount = parseFloat(editForm.amount);
      if (!isNaN(newAmount) && newAmount !== editingCotisation.amount) {
        body.amount = newAmount;
      }

      if (editForm.status !== editingCotisation.status) {
        body.status = editForm.status;
      }

      const existingDate = new Date(editingCotisation.dueDate)
        .toISOString()
        .split("T")[0];
      if (editForm.dueDate !== existingDate) {
        body.dueDate = editForm.dueDate;
      }

      if (editForm.notes !== (editingCotisation.notes || "")) {
        body.notes = editForm.notes || null;
      }

      if (editForm.invoiceRef !== (editingCotisation.invoiceRef || "")) {
        body.invoiceRef = editForm.invoiceRef || null;
      }

      if (Object.keys(body).length === 0) {
        setEditingCotisation(null);
        return;
      }

      const res = await fetch(`/api/cotisations/${editingCotisation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      setEditingCotisation(null);
      await fetchCotisations();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSavingEdit(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Relance
  // ---------------------------------------------------------------------------

  async function handleRelance() {
    setRelancing(true);
    setError("");
    setRelanceResult(null);
    try {
      const res = await fetch("/api/cotisations/relance", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la relance");
      }
      const json = await res.json();
      setRelanceResult(json.data);
      await fetchCotisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setRelancing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const totalAttendu = cotisations.reduce((sum, c) => sum + c.amount, 0);
  const totalEncaisse = cotisations
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0);
  const enAttente = cotisations.filter((c) => c.status === "PENDING").length;
  const enRetard = cotisations.filter((c) => c.status === "OVERDUE").length;
  const suspended = cotisations.filter(
    (c) => c.status === "SUSPENDED"
  ).length;

  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => currentYear - 2 + i
  );

  const displayed = statusFilter
    ? cotisations.filter((c) => c.status === statusFilter)
    : cotisations;

  const canManage = userRole ? canManageCotisations(userRole) : false;
  const canLift = userRole ? canLiftSuspension(userRole) : false;

  function getAvailableTransitions(currentStatus: string): string[] {
    const transitions = VALID_TRANSITIONS[currentStatus] ?? [];
    // Filter out SUSPENDED→PAID/PENDING if user can't lift suspension
    if (currentStatus === "SUSPENDED" && !canLift) {
      return [];
    }
    return transitions;
  }

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Cotisations
          </h1>
          <p className="text-muted-foreground">
            Suivi et gestion des appels de cotisation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          {canManage && (
            <>
              <Button
                variant="outline"
                onClick={handleRelance}
                disabled={relancing}
              >
                {relancing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Relance...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Relancer les impayés
                  </>
                )}
              </Button>
              <Button onClick={() => setShowConfirm(true)}>
                <Zap className="mr-2 h-4 w-4" />
                Générer les appels
              </Button>
            </>
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
              Cette action va générer les appels de cotisation pour
              l&apos;année {year} pour tous les adhérents actifs. Date
              d&apos;échéance par défaut : 31 mars {year}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={handleGenerate} disabled={generating}>
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

      {relanceResult && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          Relance effectuée : {relanceResult.newlyMarkedOverdue} cotisation(s)
          nouvellement marquée(s) en retard. Total en retard :{" "}
          {relanceResult.totalOverdue}.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>
            Fermer
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editingCotisation && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4" />
              Modifier la cotisation - {editingCotisation.adherent.companyName}
            </CardTitle>
            <CardDescription>
              Année {editingCotisation.year} | Statut actuel :{" "}
              {STATUS_CONFIG[editingCotisation.status]?.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {editError && (
              <div className="col-span-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={editingCotisation.status}>
                  {STATUS_CONFIG[editingCotisation.status]?.label} (actuel)
                </option>
                {getAvailableTransitions(editingCotisation.status).map(
                  (status) => (
                    <option key={status} value={status}>
                      {STATUS_CONFIG[status]?.label}
                    </option>
                  )
                )}
              </select>
              {editingCotisation.status === "PAID" && (
                <p className="text-xs text-muted-foreground">
                  Cotisation payée : statut verrouillé
                </p>
              )}
              {editingCotisation.status === "SUSPENDED" && !canLift && (
                <p className="text-xs text-amber-600">
                  Seul le Président ou l&apos;Admin peut lever une suspension
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Montant</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date d&apos;échéance</Label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>N° Facture</Label>
              <Input
                value={editForm.invoiceRef}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    invoiceRef: e.target.value,
                  }))
                }
                placeholder="REF-2026-001"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Input
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Notes internes..."
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setEditingCotisation(null)}
              disabled={savingEdit}
            >
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
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
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className={`cursor-pointer transition-shadow ${statusFilter === "" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setStatusFilter("")}
        >
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
            <p className="text-xs text-muted-foreground">
              {cotisations.length} cotisation(s)
            </p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-shadow ${statusFilter === "PAID" ? "ring-2 ring-green-500" : "hover:shadow-md"}`}
          onClick={() =>
            setStatusFilter(statusFilter === "PAID" ? "" : "PAID")
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encaissé</CardTitle>
            <div className="rounded-md bg-green-50 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatEuros(totalEncaisse)}
            </div>
            <p className="text-xs text-muted-foreground">
              {cotisations.filter((c) => c.status === "PAID").length} payée(s)
            </p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-shadow ${statusFilter === "PENDING" ? "ring-2 ring-yellow-500" : "hover:shadow-md"}`}
          onClick={() =>
            setStatusFilter(statusFilter === "PENDING" ? "" : "PENDING")
          }
        >
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
        <Card
          className={`cursor-pointer transition-shadow ${statusFilter === "OVERDUE" ? "ring-2 ring-red-500" : "hover:shadow-md"}`}
          onClick={() =>
            setStatusFilter(statusFilter === "OVERDUE" ? "" : "OVERDUE")
          }
        >
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
        <Card
          className={`cursor-pointer transition-shadow ${statusFilter === "SUSPENDED" ? "ring-2 ring-gray-500" : "hover:shadow-md"}`}
          onClick={() =>
            setStatusFilter(statusFilter === "SUSPENDED" ? "" : "SUSPENDED")
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspendues</CardTitle>
            <div className="rounded-md bg-gray-100 p-2">
              <Clock className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{suspended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5" />
            Cotisations {year} ({displayed.length}
            {statusFilter ? ` ${STATUS_CONFIG[statusFilter]?.label}` : ""})
          </CardTitle>
          {statusFilter && (
            <button
              className="text-sm text-primary underline"
              onClick={() => setStatusFilter("")}
            >
              Voir toutes les cotisations
            </button>
          )}
        </CardHeader>
        <CardContent>
          {displayed.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucune cotisation
              {statusFilter
                ? ` ${STATUS_CONFIG[statusFilter]?.label.toLowerCase()}`
                : ""}{" "}
              pour l&apos;année {year}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Entreprise</th>
                    <th className="hidden pb-3 pr-4 font-medium md:table-cell">
                      Contact
                    </th>
                    <th className="pb-3 pr-4 font-medium">Montant</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="hidden pb-3 pr-4 font-medium md:table-cell">
                      Échéance
                    </th>
                    <th className="hidden pb-3 pr-4 font-medium lg:table-cell">
                      Paiement
                    </th>
                    {canManage && (
                      <th className="pb-3 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((cot) => {
                    const statusConf =
                      STATUS_CONFIG[cot.status] || STATUS_CONFIG.PENDING;
                    const StatusIcon = statusConf.icon;
                    const transitions = getAvailableTransitions(cot.status);

                    return (
                      <tr
                        key={cot.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {cot.adherent.companyName}
                        </td>
                        <td className="hidden py-3 pr-4 md:table-cell">
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
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                        </td>
                        <td className="hidden py-3 pr-4 md:table-cell">
                          {formatDate(cot.dueDate)}
                        </td>
                        <td className="hidden py-3 pr-4 lg:table-cell">
                          {cot.paidAt ? formatDate(cot.paidAt) : "-"}
                        </td>
                        {canManage && (
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {/* Edit button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Modifier"
                                onClick={() => openEdit(cot)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              {/* Quick status dropdown */}
                              {transitions.length > 0 && (
                                <div className="relative" ref={actionMenuId === cot.id ? menuRef : undefined}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setActionMenuId(
                                        actionMenuId === cot.id
                                          ? null
                                          : cot.id
                                      )
                                    }
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  {actionMenuId === cot.id && (
                                    <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
                                      <div className="py-1">
                                        {transitions.includes("PAID") && (
                                          <button
                                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                                            onClick={() =>
                                              handleStatusChange(
                                                cot.id,
                                                "PAID"
                                              )
                                            }
                                          >
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                            Marquer payée
                                          </button>
                                        )}
                                        {transitions.includes("OVERDUE") && (
                                          <button
                                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                                            onClick={() =>
                                              handleStatusChange(
                                                cot.id,
                                                "OVERDUE"
                                              )
                                            }
                                          >
                                            <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                                            Marquer en retard
                                          </button>
                                        )}
                                        {transitions.includes("SUSPENDED") && (
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
                                        {transitions.includes("PENDING") && (
                                          <button
                                            className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
                                            onClick={() =>
                                              handleStatusChange(
                                                cot.id,
                                                "PENDING"
                                              )
                                            }
                                          >
                                            <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                                            Remettre en attente
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
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
