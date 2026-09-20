import type { UserRole } from "@prisma/client";
import type { AuthContext, Permission } from "./types";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "clients:read",
    "clients:write",
    "invoices:read",
    "invoices:write",
    "payments:write",
    "relances:read",
    "relances:write",
    "import:execute",
    "scoring:configure",
    "ai:configure",
    "team:manage",
    "organization:manage",
    "alerts:receive",
  ],
  dirigeant: [
    "clients:read",
    "clients:write",
    "invoices:read",
    "invoices:write",
    "payments:write",
    "relances:read",
    "relances:write",
    "import:execute",
    "scoring:configure",
    "ai:configure",
    "organization:manage",
    "alerts:receive",
  ],
  comptable: [
    "clients:read",
    "clients:write",
    "invoices:read",
    "invoices:write",
    "payments:write",
    "relances:read",
    "relances:write",
    "import:execute",
    "alerts:receive",
  ],
  commercial: ["clients:read", "invoices:read", "relances:read", "relances:write", "alerts:receive"],
};

export function hasPermission(ctx: AuthContext, permission: Permission): boolean {
  if (permission === "alerts:receive") {
    return ctx.canReceiveAlerts && ROLE_PERMISSIONS[ctx.role].includes(permission);
  }
  if (permission === "relances:write" && ctx.role === "commercial") {
    return ctx.canRelanceClients;
  }
  return ROLE_PERMISSIONS[ctx.role].includes(permission);
}

/**
 * Version simplifiée de hasPermission utilisable sans AuthContext complet
 * (ex. la Sidebar, un composant client qui ne connaît que le rôle courant).
 * Ignore volontairement les cas particuliers "alerts:receive" et
 * "relances:write" pour commercial : usage réservé à l'affichage/masquage
 * de la navigation, jamais à une décision d'autorisation côté serveur.
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(ctx: AuthContext, permission: Permission): void {
  if (!hasPermission(ctx, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
