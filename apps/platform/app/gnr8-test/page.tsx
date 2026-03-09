import { examplePage } from "@/gnr8/example/example-page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { PageRenderer } from "@/gnr8/renderer/PageRenderer";
import type { Gnr8Page } from "@/gnr8/types/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Gnr8TestPage() {
  let page: Gnr8Page = examplePage;

  try {
    const dbPage = await getPageBySlug("home");
    if (dbPage) {
      page = dbPage;
    }
  } catch {
    // Fallback to the static example page when DB is not reachable.
  }

  return <PageRenderer page={page} />;
}
