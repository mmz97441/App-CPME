"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Landmark,
  CalendarDays,
  MapPin,
  Users,
  Video,
  Plus,
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
import { Input } from "@/components/ui/input";
import { hasMinRole } from "@/types/rbac";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstanceConvocation {
  id: string;
  date: string;
  subject: string;
  description: string | null;
  location: string | null;
  isOnline: boolean;
  onlineLink: string | null;
  emargementCount: number;
}

interface InstanceData {
  id: string;
  name: string;
  description: string | null;
  convocationCount: number;
  voteSessionCount: number;
  recentConvocations: InstanceConvocation[];
  nextConvocation: InstanceConvocation | null;
}

interface ConvocationData {
  id: string;
  instanceId: string;
  instanceName: string;
  date: string;
  subject: string;
  description: string | null;
  location: string | null;
  isOnline: boolean;
  onlineLink: string | null;
  emargementCount: number;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GouvernancePage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;
  const canCreateConvocation = userRole
    ? hasMinRole(userRole, "DELEGUE_GENERAL")
    : false;

  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [upcomingConvocations, setUpcomingConvocations] = useState<
    ConvocationData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New convocation form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    instanceId: "",
    date: "",
    subject: "",
    description: "",
    location: "",
    isOnline: false,
    onlineLink: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [instancesRes, convocationsRes] = await Promise.all([
        fetch("/api/gouvernance"),
        fetch("/api/gouvernance/convocations?upcoming=true"),
      ]);

      if (!instancesRes.ok) {
        throw new Error("Erreur lors du chargement des instances");
      }
      if (!convocationsRes.ok) {
        throw new Error("Erreur lors du chargement des convocations");
      }

      const instancesData = await instancesRes.json();
      const convocationsData = await convocationsRes.json();

      setInstances(instancesData.data ?? []);
      setUpcomingConvocations(convocationsData.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Create convocation
  // -------------------------------------------------------------------------

  async function handleCreateConvocation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/gouvernance/convocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          onlineLink: formData.onlineLink || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      setShowForm(false);
      setFormData({
        instanceId: "",
        date: "",
        subject: "",
        description: "",
        location: "",
        isOnline: false,
        onlineLink: "",
      });
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gouvernance</h1>
          <p className="text-muted-foreground">
            Instances, convocations et sessions de vote
          </p>
        </div>
        {canCreateConvocation && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle convocation
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* New Convocation Form */}
      {showForm && canCreateConvocation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">
              Nouvelle convocation
            </CardTitle>
            <CardDescription>
              Planifier une nouvelle convocation pour une instance de
              gouvernance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateConvocation} className="space-y-4">
              {formError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Instance select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instance *</label>
                  <select
                    value={formData.instanceId}
                    onChange={(e) =>
                      setFormData({ ...formData, instanceId: e.target.value })
                    }
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Sélectionner une instance</option>
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Date et heure *
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Objet *</label>
                <Input
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Objet de la convocation"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description ou ordre du jour"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lieu</label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Adresse du lieu"
                  />
                </div>

                {/* Online */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Visioconférence
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.isOnline}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isOnline: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      En ligne
                    </label>
                  </div>
                  {formData.isOnline && (
                    <Input
                      value={formData.onlineLink}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          onlineLink: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      type="url"
                    />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer la convocation"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Instances cards */}
      <div>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Instances
        </h2>
        {instances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune instance de gouvernance configurée.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Landmark className="h-4 w-4 text-primary" />
                      {instance.name}
                    </CardTitle>
                    {instance.description && (
                      <CardDescription>
                        {instance.description}
                      </CardDescription>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Convocations
                      </span>
                      <Badge variant="secondary">
                        {instance.convocationCount}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Sessions de vote
                      </span>
                      <Badge variant="secondary">
                        {instance.voteSessionCount}
                      </Badge>
                    </div>
                    {instance.nextConvocation ? (
                      <div className="rounded-md bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-600">
                          Prochaine convocation
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatDateShort(instance.nextConvocation.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {instance.nextConvocation.subject}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md bg-gray-50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Aucune convocation à venir
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming convocations */}
      <div>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Prochaines convocations
        </h2>
        {upcomingConvocations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune convocation à venir.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingConvocations.map((conv) => (
              <Card key={conv.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Date column */}
                  <div className="flex flex-col items-center rounded-md bg-primary/10 px-3 py-2 text-center">
                    <span className="text-xs font-medium text-primary">
                      {new Date(conv.date).toLocaleDateString("fr-FR", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {new Date(conv.date).getDate()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conv.date)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {conv.subject}
                      </h3>
                      <Badge variant="outline">{conv.instanceName}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateFr(conv.date)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {conv.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {conv.location}
                        </span>
                      )}
                      {conv.isOnline && (
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Visioconférence
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {conv.emargementCount} émargement
                        {conv.emargementCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Créée par {conv.createdBy.name || conv.createdBy.email}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
