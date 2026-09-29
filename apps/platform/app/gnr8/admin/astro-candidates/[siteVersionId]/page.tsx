import { redirect } from "next/navigation";

import {
  createAstroProductionCandidateListPageLoader,
} from "@/gnr8/output-adapters/astro-production-candidate-list-read-model";

import { AstroCandidateListPageView } from "./astro-candidate-list-components";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PageProps = {
  params: Promise<{ siteVersionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadAstroCandidateListPage = createAstroProductionCandidateListPageLoader();

export default async function AstroCandidateListPage(props: PageProps) {
  try {
    const model = await loadAstroCandidateListPage({
      params: props.params,
      searchParams: props.searchParams,
    });
    return <AstroCandidateListPageView model={model} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }
}
