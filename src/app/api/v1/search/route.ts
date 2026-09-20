import { searchQuerySchema } from "@/modules/search/schemas";
import { searchService } from "@/modules/search/service";
import { jsonOk, withAuth } from "@/shared/api/handler";

export const GET = withAuth("clients:read", async (ctx, request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { q, limit } = searchQuerySchema.parse(params);
  const result = await searchService.search(ctx.organizationId, q, limit);
  return jsonOk(result);
});
