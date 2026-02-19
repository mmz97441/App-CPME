"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  UserPlus,
  Loader2,
  X,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types/rbac";
import type { Role } from "@prisma/client";
import { formatDate } from "@/utils/cotisation";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADHERENT", label: ROLE_LABELS.ADHERENT },
  { value: "MEMBRE_CA", label: ROLE_LABELS.MEMBRE_CA },
  { value: "MEMBRE_BUREAU", label: ROLE_LABELS.MEMBRE_BUREAU },
  { value: "TRESORIER", label: ROLE_LABELS.TRESORIER },
  { value: "DELEGUE_GENERAL", label: ROLE_LABELS.DELEGUE_GENERAL },
  { value: "PRESIDENT", label: ROLE_LABELS.PRESIDENT },
  { value: "ADMIN", label: ROLE_LABELS.ADMIN },
];

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "ADHERENT" as Role,
  });

  const userRole = session?.user?.role as Role | undefined;

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (userRole !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok)
          throw new Error("Erreur lors du chargement des utilisateurs");
        const data = await res.json();
        setUsers(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [userRole, sessionStatus, router]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      if (!form.email || !form.name || !form.password) {
        throw new Error("Tous les champs sont requis");
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const data = await res.json();
      const newUser = data.data ?? data;
      setUsers((prev) => [...prev, newUser]);
      setForm({ email: "", name: "", password: "", role: "ADHERENT" });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Administration
          </h1>
          <p className="text-muted-foreground">
            Gestion des utilisateurs et des accès
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Fermer
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Nouvel utilisateur
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create user form */}
      {showForm && (
        <Card className="border-primary">
          <form onSubmit={handleCreateUser}>
            <CardHeader>
              <CardTitle className="text-base">
                Créer un nouvel utilisateur
              </CardTitle>
              <CardDescription>
                Remplissez les informations pour créer un nouveau compte
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {formError && (
                <div className="col-span-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="utilisateur@cpme.fr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Nom</Label>
                <Input
                  id="new-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Mot de passe sécurisé"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Rôle</Label>
                <select
                  id="new-role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as Role,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer l'utilisateur"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5" />
            Utilisateurs ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Nom</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Rôle</th>
                    <th className="pb-3 pr-4 font-medium">Actif</th>
                    <th className="pb-3 font-medium">Date création</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {user.name || "-"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {user.isActive ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inactif</Badge>
                        )}
                      </td>
                      <td className="py-3">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
