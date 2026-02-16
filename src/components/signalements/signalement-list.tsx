"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Signalement {
  id: string;
  title: string;
  description: string;
  estimatedTimeLoss: number;
  estimatedCost: number;
  level: string;
  sector: string;
  severityScore: number;
  votesCount: number;
  createdAt: string;
  user: { name: string | null };
}

export function SignalementList() {
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSignalements();
  }, [page]);

  async function fetchSignalements() {
    setLoading(true);
    try {
      const res = await fetch(`/api/signalements?page=${page}&pageSize=10`);
      const data = await res.json();
      if (data.success) {
        setSignalements(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Error fetching signalements:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(id: string) {
    try {
      const res = await fetch(`/api/signalements/${id}/vote`, {
        method: "POST",
      });
      if (res.ok) {
        fetchSignalements();
      }
    } catch (err) {
      console.error("Vote error:", err);
    }
  }

  function getLevelBadge(level: string) {
    switch (level) {
      case "LOCAL":
        return <Badge variant="secondary">Local</Badge>;
      case "NATIONAL":
        return <Badge>National</Badge>;
      case "EU":
        return <Badge variant="destructive">Européen</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  }

  function getSeverityColor(score: number): string {
    if (score <= 30) return "text-green-600";
    if (score <= 50) return "text-yellow-600";
    if (score <= 70) return "text-orange-600";
    return "text-red-600";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signalements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun signalement pour le moment.
          </CardContent>
        </Card>
      ) : (
        signalements.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <CardDescription>
                    Par {s.user.name || "Anonyme"} &middot;{" "}
                    {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getLevelBadge(s.level)}
                  <Badge variant="outline">{s.sector}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                {s.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span>
                    <strong className={getSeverityColor(s.severityScore)}>
                      {s.severityScore.toFixed(1)}
                    </strong>{" "}
                    / 100 gravité
                  </span>
                  <span>{s.estimatedTimeLoss}h perdues/an</span>
                  <span>{s.estimatedCost.toLocaleString("fr-FR")} EUR/an</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(s.id)}
                >
                  <svg
                    className="mr-1 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  {s.votesCount}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
