import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import type { AuthContext } from "./types";
import { createSupabaseServerClient } from "./supabase-server";

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
  });

  if (!dbUser) {
    throw new AppError("User not found in organization", 403, "USER_NOT_FOUND");
  }

  return {
    userId: dbUser.id,
    authUserId: dbUser.authUserId,
    organizationId: dbUser.organizationId,
    role: dbUser.role,
    email: dbUser.email,
    displayName: typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined,
    canReceiveAlerts: dbUser.canReceiveAlerts,
    canRelanceClients: dbUser.canRelanceClients,
  };
}

export async function getServiceAuthContext(organizationId: string): Promise<Pick<AuthContext, "organizationId">> {
  return { organizationId };
}
