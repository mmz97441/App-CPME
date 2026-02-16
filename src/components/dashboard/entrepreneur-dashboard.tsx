"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DashboardData {
  latestDiagnostic: {
    id: string;
    complexityScore: number;
    fiscalScore: number;
    socialScore: number;
    adminScore: number;
    createdAt: string;
  } | null;
  latestHealth: {
    score: number;
    createdAt: string;
  } | null;
  diagnosticHistory: {
    complexityScore: number;
    createdAt: string;
  }[];
  healthHistory: {
    score: number;
    createdAt: string;
  }[];
  regionalAvg: number | null;
  company: {
    name: string;
    sector: string;
    region: string;
  } | null;
}

function getScoreColor(score: number): string {
  if (score <= 30) return "text-green-600";
  if (score <= 50) return "text-yellow-600";
  if (score <= 70) return "text-orange-600";
  return "text-red-600";
}

function getScoreLabel(score: number): string {
  if (score <= 30) return "Faible";
  if (score <= 50) return "Modéré";
  if (score <= 70) return "Élevé";
  return "Critique";
}

export function EntrepreneurDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      // Fetch all dashboard data in parallel
      const [userRes, diagRes, healthRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/diagnostics?pageSize=50"),
        fetch("/api/health-assessments?pageSize=50"),
      ]);

      const userData = await userRes.json();
      const diagData = await diagRes.json();
      const healthData = await healthRes.json();

      const diagnostics = diagData.data || [];
      const healthAssessments = healthData.data || [];

      setData({
        latestDiagnostic: diagnostics[0] || null,
        latestHealth: healthAssessments[0] || null,
        diagnosticHistory: diagnostics.map(
          (d: { complexityScore: number; createdAt: string }) => ({
            complexityScore: d.complexityScore,
            createdAt: d.createdAt,
          })
        ),
        healthHistory: healthAssessments.map(
          (h: { score: number; createdAt: string }) => ({
            score: h.score,
            createdAt: h.createdAt,
          })
        ),
        regionalAvg: null,
        company: userData.data?.company || null,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportPDF() {
    if (!data?.latestDiagnostic) return;
    window.open(
      `/api/export/pdf?diagnosticId=${data.latestDiagnostic.id}`,
      "_blank"
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!data?.company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bienvenue sur l&apos;Observatoire PME</CardTitle>
          <CardDescription>
            Pour commencer, renseignez votre profil entreprise puis réalisez
            votre premier diagnostic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => (window.location.href = "/diagnostic")}
          >
            Commencer mon diagnostic
          </Button>
        </CardContent>
      </Card>
    );
  }

  const radarData = data.latestDiagnostic
    ? [
        { dimension: "Fiscal", score: data.latestDiagnostic.fiscalScore },
        { dimension: "Social", score: data.latestDiagnostic.socialScore },
        { dimension: "Administratif", score: data.latestDiagnostic.adminScore },
      ]
    : [];

  const historyData = data.diagnosticHistory
    .slice()
    .reverse()
    .map((d) => ({
      date: new Date(d.createdAt).toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),
      score: d.complexityScore,
    }));

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{data.company.name}</h2>
          <p className="text-sm text-muted-foreground">
            {data.company.sector} &middot; {data.company.region}
          </p>
        </div>
        {data.latestDiagnostic && (
          <Button variant="outline" onClick={handleExportPDF}>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export PDF
          </Button>
        )}
      </div>

      {/* Score Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score Complexité (ICG)</CardDescription>
            <CardTitle
              className={`text-3xl ${
                data.latestDiagnostic
                  ? getScoreColor(data.latestDiagnostic.complexityScore)
                  : ""
              }`}
            >
              {data.latestDiagnostic
                ? data.latestDiagnostic.complexityScore.toFixed(1)
                : "—"}
              <span className="text-lg text-muted-foreground"> / 100</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestDiagnostic && (
              <Progress value={data.latestDiagnostic.complexityScore} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Santé Dirigeant (SSD)</CardDescription>
            <CardTitle
              className={`text-3xl ${
                data.latestHealth
                  ? data.latestHealth.score > 70
                    ? "text-red-600"
                    : "text-green-600"
                  : ""
              }`}
            >
              {data.latestHealth
                ? data.latestHealth.score.toFixed(1)
                : "—"}
              <span className="text-lg text-muted-foreground"> / 100</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestHealth && (
              <Progress value={data.latestHealth.score} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Niveau Complexité</CardDescription>
            <CardTitle className="text-xl">
              {data.latestDiagnostic
                ? getScoreLabel(data.latestDiagnostic.complexityScore)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Basé sur votre dernier diagnostic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Moyenne Régionale</CardDescription>
            <CardTitle className="text-3xl">
              {data.regionalAvg !== null
                ? data.regionalAvg.toFixed(1)
                : "—"}
              <span className="text-lg text-muted-foreground"> / 100</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Score moyen pour {data.company.region}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar Chart */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Profil de Complexité</CardTitle>
              <CardDescription>
                Répartition par domaine de votre dernier diagnostic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(221, 83%, 28%)"
                    fill="hsl(221, 83%, 28%)"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Evolution Chart */}
        {historyData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Évolution du Score</CardTitle>
              <CardDescription>
                Historique de votre Indice de Complexité Globale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(221, 83%, 28%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(221, 83%, 28%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
