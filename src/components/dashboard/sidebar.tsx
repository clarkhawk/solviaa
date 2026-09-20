"use client";

/**
 * @file sidebar.tsx
 * @description Barre de navigation latérale (Sidebar) pour Solvia SaaS.
 * Conçue selon la Maquette 1 : fond épuré, navigation structurée par catégories,
 * icônes Lucide SVG exclusives (zéro emoji), pastille active Indigo et boutons accessibles.
 *
 * @module components/dashboard/sidebar
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/shared/auth/supabase-browser";
import { roleHasPermission } from "@/shared/auth/rbac";
import type { Permission } from "@/shared/auth/types";
import {
  LayoutDashboard,
  FileText,
  Users,
  Send,
  FileSpreadsheet,
  Sliders,
  ShieldCheck,
  Bot,
  LogOut,
  HelpCircle,
  Moon,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "solvia-sidebar-collapsed";
const DARK_MODE_KEY = "solvia-dark-mode";

/**
 * Structure d'un élément de navigation.
 * `permission`, si défini, masque le lien pour tout rôle qui ne l'a pas —
 * évite d'envoyer un utilisateur vers une page dont l'API lui répondra 403
 * (voir scoring/page.tsx, qui plantait sur ce cas précis).
 */
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  permission?: Permission;
}

/**
 * Groupes de navigation métier.
 */
const mainNav: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/invoices", label: "Factures & Impayés", icon: FileText },
  { href: "/clients", label: "Clients & Débiteurs", icon: Users },
  { href: "/relances", label: "Plans de Relance", icon: Send },
  { href: "/import", label: "Importer CSV / Excel", icon: FileSpreadsheet, badge: "Nouveau" },
];

const settingsNav: NavItem[] = [
  { href: "/scoring", label: "Scoring de Risque", icon: Sliders, permission: "scoring:configure" },
  { href: "/settings/organization", label: "Entreprise & Devise", icon: Building2, permission: "organization:manage" },
  { href: "/settings/team", label: "Équipe & Permissions", icon: ShieldCheck, permission: "team:manage" },
  { href: "/settings/ai-provider", label: "Moteur IA (BYOK)", icon: Bot, permission: "ai:configure" },
];

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const visibleSettingsNav = settingsNav.filter(
    (item) => !item.permission || roleHasPermission(userRole, item.permission),
  );

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    const darkModeEnabled = window.localStorage.getItem(DARK_MODE_KEY) === "true";
    setIsDarkMode(darkModeEnabled);
    document.documentElement.classList.toggle("dark", darkModeEnabled);
  }, []);

  function toggleSidebar() {
    setIsCollapsed((collapsed) => {
      const nextCollapsed = !collapsed;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextCollapsed));
      return nextCollapsed;
    });
  }

  function toggleDarkMode() {
    setIsDarkMode((enabled) => {
      const nextEnabled = !enabled;
      document.documentElement.classList.toggle("dark", nextEnabled);
      window.localStorage.setItem(DARK_MODE_KEY, String(nextEnabled));
      return nextEnabled;
    });
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-[#E2E8F0] bg-white transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* En-tête avec Logo Solvia */}
      <div className={cn("flex h-16 items-center border-b border-[#E2E8F0]", isCollapsed ? "justify-center px-2" : "gap-2.5 px-6")}>
        <Image
          src="/logo.png"
          alt="Solviaa"
          width={128}
          height={32}
          className={cn("h-8 w-auto object-contain transition-opacity duration-200", isCollapsed ? "w-0 opacity-0" : "opacity-100")}
        />
        <button
          type="button"
          onClick={toggleSidebar}
          aria-pressed={isCollapsed}
          aria-label={isCollapsed ? "Déplier le menu" : "Replier le menu"}
          title={isCollapsed ? "Déplier le menu" : "Replier le menu"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#4F46E5]"
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation principale */}
      <div className={cn("flex flex-1 flex-col overflow-y-auto py-6", isCollapsed ? "px-2" : "px-4")}>
        {/* Section Gestion */}
        <div className="mb-6">
          <p className={cn("mb-2 overflow-hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] transition-opacity duration-200", isCollapsed ? "h-0 opacity-0" : "h-4 opacity-100")}>
            Gestion
          </p>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-xl py-2 text-xs font-semibold transition-all",
                    isCollapsed ? "justify-center px-3" : "px-3",
                    isActive
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
                  )}
                >
                  <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                    <Icon className={cn("h-4 w-4", isActive ? "text-[#4F46E5]" : "text-[#94A3B8]")} />
                    <span className={cn("overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>{item.label}</span>
                  </div>
                  {item.badge && !isCollapsed && (
                    <span className="rounded-md bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#4F46E5]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section Configuration */}
        <div className="mb-6">
          <p className={cn("mb-2 overflow-hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] transition-opacity duration-200", isCollapsed ? "h-0 opacity-0" : "h-4 opacity-100")}>
            Configuration
          </p>
          <nav className="space-y-1">
            {visibleSettingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-xl py-2 text-xs font-semibold transition-all",
                    isCollapsed ? "justify-center px-3" : "gap-3 px-3",
                    isActive
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-[#4F46E5]" : "text-[#94A3B8]")} />
                  <span className={cn("overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Aide et apparence */}
        <div className={cn("mt-auto flex gap-2", isCollapsed ? "flex-col" : "flex-row")}>
          <a
            href="https://github.com/clarkhawk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Aide et documentation"
            title={isCollapsed ? "Aide et documentation" : undefined}
            className={cn("flex items-center rounded-xl py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#4F46E5]", isCollapsed ? "justify-center px-3" : "flex-1 gap-3 px-3")}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className={cn("overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>Aide</span>
          </a>
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-pressed={isDarkMode}
            aria-label={isDarkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            title={isCollapsed ? (isDarkMode ? "Mode clair" : "Mode sombre") : undefined}
            className={cn("flex items-center rounded-xl py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#4F46E5]", isCollapsed ? "justify-center px-3" : "flex-1 gap-3 px-3")}
          >
            {isDarkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            <span className={cn("overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>{isDarkMode ? "Mode clair" : "Mode sombre"}</span>
          </button>
        </div>
      </div>

      {/* Pied de sidebar */}
      <div className={cn("border-t border-[#E2E8F0]", isCollapsed ? "p-2" : "p-4")}>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Déconnexion"
          title={isCollapsed ? "Déconnexion" : undefined}
          className={cn("flex w-full items-center rounded-xl py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]", isCollapsed ? "justify-center px-3" : "gap-3 px-3")}
        >
          <LogOut className="h-4 w-4" />
          <span className={cn("overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
