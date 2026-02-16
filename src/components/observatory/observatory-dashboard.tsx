"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ObservatoryData {
  heatmapData: { region: string; avgScore: number; count: number }[];
  topIrritants: {
    id: string;
    title: string;
    severityScore: number;
    votesCount: number;
    sector: string;
    level: string;
  }[];
  averageScore: { score: number; totalDiagnostics: number };
  trendData: { period: string; avgScore: number; count: number }[];
  sectorData: { sector: string; avgScore: number; count: number }[];
}

function getScoreColor(score: number): string {
  if (score <= 30) return "#22c55e";
  if (score <= 50) return "#f59e0b";
  if (score <= 70) return "#f97316";
  return "#ef4444";
}

export function ObservatoryDashboard() {
  const [data, setData] = useState<ObservatoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [sectorFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sectorFilter) params.set("sector", sectorFilter);

      const res = await fetch(`/api/observatory?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error("Error fetching observatory data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
        >
          <option value="">Tous les secteurs</option>
          {data.sectorData.map((s) => (
            <option key={s.sector} value={s.sector}>
              {s.sector}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score Complexité Moyen</CardDescription>
            <CardTitle
              className="text-3xl"
              style={{ color: getScoreColor(data.averageScore.score) }}
            >
              {data.averageScore.score.toFixed(1)}
              <span className="text-lg text-muted-foreground"> / 100</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sur {data.averageScore.totalDiagnostics} diagnostics réalisés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Signalements actifs</CardDescription>
            <CardTitle className="text-3xl">
              {data.topIrritants.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Top irritants identifiés par les entrepreneurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Régions couvertes</CardDescription>
            <CardTitle className="text-3xl">
              {data.heatmapData.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Régions avec des données de diagnostic
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Regional Heatmap (as bar chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Complexité par Région</CardTitle>
            <CardDescription>
              Score moyen de complexité par région
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={data.heatmapData.sort((a, b) => b.avgScore - a.avgScore)}
                layout="vertical"
                margin={{ left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="region"
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)} / 100`,
                    "Score",
                  ]}
                />
                <Bar
                  dataKey="avgScore"
                  fill="hsl(221, 83%, 28%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quarterly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Trimestrielle</CardTitle>
            <CardDescription>
              Tendance du score de complexité dans le temps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)} / 100`,
                    "Score moyen",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="hsl(221, 83%, 28%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(221, 83%, 28%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sector Radar + Top Irritants */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sector Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Complexité par Secteur</CardTitle>
            <CardDescription>Vue radar des scores sectoriels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={data.sectorData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="sector" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Score moyen"
                  dataKey="avgScore"
                  stroke="hsl(221, 83%, 28%)"
                  fill="hsl(221, 83%, 28%)"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 10 Irritants */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Irritants</CardTitle>
            <CardDescription>
              Signalements les plus impactants par score de gravité
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topIrritants.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {item.title}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.sector}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: getScoreColor(item.severityScore),
                      }}
                    >
                      {item.severityScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.votesCount} votes
                    </p>
                  </div>
                </div>
              ))}
              {data.topIrritants.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun signalement enregistré
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
