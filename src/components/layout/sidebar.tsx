"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Vote,
  Building2,
  Briefcase,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

const ROLE_HIERARCHY: Role[] = [
  "ADMIN",
  "PRESIDENT",
  "DELEGUE_GENERAL",
  "TRESORIER",
  "MEMBRE_BUREAU",
  "MEMBRE_CA",
  "ADHERENT",
];

function hasMinRole(userRole: Role, minRole: Role): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const minIndex = ROLE_HIERARCHY.indexOf(minRole);
  return userIndex !== -1 && userIndex <= minIndex;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  PRESIDENT: "Président",
  DELEGUE_GENERAL: "Délégué Général",
  TRESORIER: "Trésorier",
  MEMBRE_BUREAU: "Membre du Bureau",
  MEMBRE_CA: "Membre du CA",
  ADHERENT: "Adhérent",
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  minRole?: Role;
  exactRole?: Role;
}

const navItems: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Adhérents",
    href: "/adherents",
    icon: Users,
  },
  {
    label: "Cotisations",
    href: "/cotisations",
    icon: CreditCard,
  },
  {
    label: "Liste Électorale",
    href: "/electoral",
    icon: Vote,
  },
  {
    label: "Gouvernance",
    href: "/gouvernance",
    icon: Building2,
    minRole: "MEMBRE_BUREAU",
  },
  {
    label: "Mandats",
    href: "/mandats",
    icon: Briefcase,
    minRole: "DELEGUE_GENERAL",
  },
  {
    label: "Tickets",
    href: "/tickets",
    icon: MessageSquare,
  },
  {
    label: "Administration",
    href: "/admin",
    icon: Settings,
    exactRole: "ADMIN",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = session?.user?.role as Role | undefined;

  const visibleItems = navItems.filter((item) => {
    if (!userRole) return false;
    if (item.exactRole) return userRole === item.exactRole;
    if (item.minRole) return hasMinRole(userRole, item.minRole);
    return true;
  });

  return (
    <aside className="flex w-64 flex-col bg-slate-900 text-white">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 font-bold text-white text-sm">
          C
        </div>
        <span className="text-lg font-semibold tracking-tight">CPME-OS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info & Sign out */}
      {session?.user && (
        <div className="border-t border-slate-700 p-4">
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-white">
              {session.user.name || session.user.email}
            </p>
            <p className="truncate text-xs text-slate-400">
              {userRole ? ROLE_LABELS[userRole] : ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </aside>
  );
}
