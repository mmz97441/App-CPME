"use client";

import { useSession } from "next-auth/react";
import { User, Mail, Shield, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types/rbac";
import type { Role } from "@prisma/client";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        Vous devez être connecté pour accéder à cette page.
      </div>
    );
  }

  const userRole = session.user.role as Role;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">
          Informations de votre compte utilisateur
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle>{session.user.name || "Utilisateur"}</CardTitle>
              <CardDescription>{session.user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <dt className="text-sm text-muted-foreground">Nom</dt>
              <dd className="ml-auto text-sm font-medium">
                {session.user.name || "Non renseigné"}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="ml-auto text-sm font-medium">
                {session.user.email}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <dt className="text-sm text-muted-foreground">Rôle</dt>
              <dd className="ml-auto">
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {ROLE_LABELS[userRole] || userRole}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
