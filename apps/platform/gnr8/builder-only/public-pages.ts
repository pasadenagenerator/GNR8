import "server-only";

import { registerBuilderOnlyModule } from "@gnr8/builder-only/builder-boundary-guard";

registerBuilderOnlyModule(import.meta.url);

export type PublicPage = {
  id: string;
  orgId: string;
  slug: string;
  title: string | null;
  data: any;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getPublicPageByOrgAndSlug(input: {
  orgId: string;
  slug: string;
  host?: string | null;
}): Promise<PublicPage | null> {
  void input;
  throw new Error("BUILDER_PAGE_STORAGE_DECOMMISSIONED");
}
