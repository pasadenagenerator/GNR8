import { getSiteVersion, switchActivePointer } from "@/gnr8/runtime/runtime-store";

export async function rollbackToSiteVersionArtifact(input: { siteVersionId: string }): Promise<{
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  switched: boolean;
  previousActivePointer: { siteVersionId: string; artifactId: string } | null;
}> {
  const target = await getSiteVersion(input.siteVersionId);
  if (!target) throw new Error("SiteVersion not found");
  if (!target.artifactId) throw new Error("Target SiteVersion has no bound artifact");

  const pointerSwitch = await switchActivePointer({
    siteId: target.siteId,
    siteVersionId: target.id,
    artifactId: target.artifactId,
  });

  return {
    siteId: target.siteId,
    siteVersionId: target.id,
    artifactId: target.artifactId,
    switched: pointerSwitch.switched,
    previousActivePointer: pointerSwitch.previousActivePointer,
  };
}
