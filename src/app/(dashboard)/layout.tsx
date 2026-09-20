/**
 * @file layout.tsx
 * @description Layout principal du tableau de bord Solvia SaaS.
 * Intègre la Sidebar latérale, le Header supérieur contextualisé avec l'organisation
 * et la zone de contenu principale défilante.
 *
 * @module app/(dashboard)/layout
 */

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { getAuthContext } from "@/shared/auth/get-auth-context";
import { prisma } from "@/shared/db/prisma";
import type { UserRole } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let organizationName = "Mon Entreprise";
  let userEmail = "utilisateur@solvia.app";
  let userDisplayName: string | undefined;
  let userRole = "admin";

  try {
    const authContext = await getAuthContext();
    userEmail = authContext.email;
    userDisplayName = authContext.displayName;
    userRole = authContext.role;

    const org = await prisma.organization.findUnique({
      where: { id: authContext.organizationId },
      select: { name: true },
    });

    if (org?.name) {
      organizationName = org.name;
    }
  } catch {
    // Si l'utilisateur est en cours de session ou en transition, conservation des fallbacks
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Barre latérale fixée */}
      <Sidebar userRole={userRole as UserRole} />

      {/* Contenu principal et Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          organizationName={organizationName}
          userEmail={userEmail}
          userDisplayName={userDisplayName}
          userRole={userRole}
        />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
