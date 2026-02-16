"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

export default function AdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a full implementation, this would fetch from an admin API
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Gestion des utilisateurs et journal d&apos;audit RGPD.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
            <CardDescription>Vue d&apos;ensemble de la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Utilisateurs inscrits
                </span>
                <Badge variant="secondary">—</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Diagnostics réalisés
                </span>
                <Badge variant="secondary">—</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Signalements actifs
                </span>
                <Badge variant="secondary">—</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal d&apos;Audit RGPD</CardTitle>
            <CardDescription>
              Traçabilité des actions administratives
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucune action enregistrée
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-md border p-2 text-xs"
                  >
                    <div>
                      <span className="font-medium">{log.action}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        par {log.user.name || log.user.email}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
