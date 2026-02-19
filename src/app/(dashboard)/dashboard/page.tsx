"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  CreditCard,
  TrendingUp,
  Wallet,
  Briefcase,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardStats } from "@/types";
import { formatEuros } from "@/utils/cotisation";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Erreur lors du chargement des statistiques");
        const data = await res.json();
        setStats(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

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

  if (!stats) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        Impossible de charger les statistiques.
      </div>
    );
  }

  const mainCards = [
    {
      title: "Total Adhérents",
      value: stats.totalAdherents ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Adhérents Actifs",
      value: stats.adherentsActifs ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Cotisations Payées",
      value: stats.cotisationsPayees ?? 0,
      icon: CreditCard,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Taux de Recouvrement",
      value: `${(stats.tauxRecouvrement ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const secondaryCards = [
    {
      title: "Recettes totales",
      value: formatEuros(stats.totalRecettes ?? 0),
      icon: Wallet,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Mandats actifs",
      value: stats.mandatsActifs ?? 0,
      icon: Briefcase,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Tickets ouverts",
      value: stats.ticketsOuverts ?? 0,
      icon: MessageSquare,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de la CPME
        </p>
      </div>

      {/* Main stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`rounded-md p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {secondaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`rounded-md p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotisations en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {stats.cotisationsEnAttente ?? 0}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              appels de cotisation en attente de paiement
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotisations en retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.cotisationsEnRetard ?? 0}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              cotisations dont la date d&apos;échéance est dépassée
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
