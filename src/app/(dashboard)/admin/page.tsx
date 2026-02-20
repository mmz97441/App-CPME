"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  UserPlus,
  Loader2,
  X,
  Shield,
  Search,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  Check,
  Copy,
  AlertTriangle,
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
  adherent?: { id: string; companyName: string } | null;
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

const ROLE_BADGE_COLORS: Partial<Record<Role, string>> = {
  ADMIN: "bg-red-100 text-red-800",
  PRESIDENT: "bg-purple-100 text-purple-800",
  DELEGUE_GENERAL: "bg-blue-100 text-blue-800",
  TRESORIER: "bg-emerald-100 text-emerald-800",
  MEMBRE_BUREAU: "bg-indigo-100 text-indigo-800",
  MEMBRE_CA: "bg-sky-100 text-sky-800",
  ADHERENT: "bg-gray-100 text-gray-800",
};

type FilterStatus = "all" | "active" | "inactive";

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "ADHERENT" as Role,
  });

  // Edit form
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "ADHERENT" as Role,
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset password
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Confirm action
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: "activate" | "deactivate";
    userName: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userRole = session?.user?.role as Role | undefined;

  const fetchUsers = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (userRole !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [userRole, sessionStatus, router, fetchUsers]);

  // ---------------------------------------------------------------------------
  // Filtered users
  // ---------------------------------------------------------------------------

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        (u.name || "").toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.adherent?.companyName || "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;

  // ---------------------------------------------------------------------------
  // Create user
  // ---------------------------------------------------------------------------

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      if (!createForm.email || !createForm.name || !createForm.password) {
        throw new Error("Tous les champs sont requis");
      }
      if (createForm.password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères");
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      setCreateForm({ email: "", name: "", password: "", role: "ADHERENT" });
      setShowCreateForm(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit user
  // ---------------------------------------------------------------------------

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: user.role,
    });
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    setSaving(true);
    setEditError("");

    try {
      const body: Record<string, unknown> = {};
      if (editForm.name !== (editingUser.name || "")) body.name = editForm.name;
      if (editForm.email !== editingUser.email) body.email = editForm.email;
      if (editForm.role !== editingUser.role) body.role = editForm.role;

      if (Object.keys(body).length === 0) {
        setEditingUser(null);
        return;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle active
  // ---------------------------------------------------------------------------

  async function handleToggleActive() {
    if (!confirmAction) return;
    setActionLoading(true);

    try {
      const newActive = confirmAction.action === "activate";
      const res = await fetch(`/api/admin/users/${confirmAction.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      setConfirmAction(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reset password
  // ---------------------------------------------------------------------------

  async function handleResetPassword() {
    if (!resetPasswordUserId) return;
    setResettingPassword(true);
    setGeneratedPassword(null);

    try {
      const res = await fetch(`/api/admin/users/${resetPasswordUserId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du reset");
      }

      const data = await res.json();
      setGeneratedPassword(data.tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setResetPasswordUserId(null);
    } finally {
      setResettingPassword(false);
    }
  }

  function copyPassword() {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
            Gestion des utilisateurs, rôles et accès
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? (
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
          <button
            className="ml-2 underline"
            onClick={() => setError("")}
          >
            Fermer
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create user form */}
      {showCreateForm && (
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
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="utilisateur@cpme.re"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Nom *</Label>
                <Input
                  id="new-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Mot de passe *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Min. 8 caractères"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Rôle *</Label>
                <select
                  id="new-role"
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
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
                onClick={() => setShowCreateForm(false)}
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

      {/* Edit user modal */}
      {editingUser && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="text-base">
              Modifier : {editingUser.name || editingUser.email}
            </CardTitle>
            <CardDescription>
              {editingUser.adherent
                ? `Adhérent : ${editingUser.adherent.companyName}`
                : "Utilisateur sans fiche adhérent"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {editError && (
              <div className="col-span-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    role: e.target.value as Role,
                  }))
                }
                disabled={editingUser.id === session?.user?.id}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {editingUser.id === session?.user?.id && (
                <p className="text-xs text-muted-foreground">
                  Vous ne pouvez pas modifier votre propre rôle
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Reset password dialog */}
      {resetPasswordUserId && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Réinitialiser le mot de passe
            </CardTitle>
            <CardDescription>
              {generatedPassword
                ? "Mot de passe généré avec succès. Communiquez-le de façon sécurisée."
                : `Voulez-vous réinitialiser le mot de passe de ${
                    users.find((u) => u.id === resetPasswordUserId)?.email
                  } ?`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedPassword ? (
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-md bg-muted px-4 py-3 font-mono text-sm font-semibold">
                  {generatedPassword}
                </code>
                <Button variant="outline" size="sm" onClick={copyPassword}>
                  {passwordCopied ? (
                    <>
                      <Check className="mr-1 h-4 w-4 text-green-600" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordUserId(null);
                setGeneratedPassword(null);
                setPasswordCopied(false);
              }}
            >
              Fermer
            </Button>
            {!generatedPassword && (
              <Button
                variant="destructive"
                onClick={handleResetPassword}
                disabled={resettingPassword}
              >
                {resettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  "Confirmer la réinitialisation"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Confirm activate/deactivate dialog */}
      {confirmAction && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Confirmation
            </CardTitle>
            <CardDescription>
              {confirmAction.action === "deactivate"
                ? `Voulez-vous désactiver le compte de "${confirmAction.userName}" ? L'utilisateur ne pourra plus se connecter.`
                : `Voulez-vous réactiver le compte de "${confirmAction.userName}" ?`}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              variant={confirmAction.action === "deactivate" ? "destructive" : "default"}
              onClick={handleToggleActive}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {confirmAction.action === "deactivate" ? "Désactiver" : "Réactiver"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou entreprise..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "")}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Tous les rôles</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {(["all", "active", "inactive"] as FilterStatus[]).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "Tous" : s === "active" ? "Actifs" : "Inactifs"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5" />
            Utilisateurs ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
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
                    <th className="hidden pb-3 pr-4 font-medium md:table-cell">
                      Entreprise
                    </th>
                    <th className="pb-3 pr-4 font-medium">Rôle</th>
                    <th className="pb-3 pr-4 font-medium">Statut</th>
                    <th className="hidden pb-3 pr-4 font-medium md:table-cell">
                      Créé le
                    </th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const isSelf = user.id === session?.user?.id;
                    return (
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
                        <td className="hidden py-3 pr-4 md:table-cell">
                          {user.adherent?.companyName || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            className={`gap-1 ${
                              ROLE_BADGE_COLORS[user.role] || ""
                            }`}
                          >
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
                        <td className="hidden py-3 pr-4 md:table-cell">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Modifier"
                              onClick={() => openEdit(user)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Réinitialiser le mot de passe"
                              onClick={() => {
                                setResetPasswordUserId(user.id);
                                setGeneratedPassword(null);
                                setPasswordCopied(false);
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title={
                                  user.isActive ? "Désactiver" : "Réactiver"
                                }
                                onClick={() =>
                                  setConfirmAction({
                                    userId: user.id,
                                    action: user.isActive
                                      ? "deactivate"
                                      : "activate",
                                    userName: user.name || user.email,
                                  })
                                }
                              >
                                {user.isActive ? (
                                  <UserX className="h-3.5 w-3.5 text-red-600" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5 text-green-600" />
                                )}
                              </Button>
                            )}
                          </div>
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
