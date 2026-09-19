import type { UserRole } from "@prisma/client";

export interface AuthContext {
  userId: string;
  authUserId: string;
  organizationId: string;
  role: UserRole;
  email: string;
  displayName?: string;
  canReceiveAlerts: boolean;
  canRelanceClients: boolean;
}

export type Permission =
  | "clients:read"
  | "clients:write"
  | "invoices:read"
  | "invoices:write"
  | "payments:write"
  | "relances:read"
  | "relances:write"
  | "import:execute"
  | "scoring:configure"
  | "ai:configure"
  | "team:manage"
  | "organization:manage"
  | "alerts:receive";
