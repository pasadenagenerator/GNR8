import type { WebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-types";

export const TWIN_STORE_DIAGNOSTICS = {
  SAVE_SUCCEEDED: "TWIN_STORE_SAVE_SUCCEEDED",
  GET_SUCCEEDED: "TWIN_STORE_GET_SUCCEEDED",
  LIST_SUCCEEDED: "TWIN_STORE_LIST_SUCCEEDED",
} as const;

export interface TwinStore {
  saveTwin(twin: WebsiteDigitalTwin): void;
  getTwin(twinId: string): WebsiteDigitalTwin | null;
  getTwinBySiteVersion(siteVersionId: string): WebsiteDigitalTwin | null;
  listTwins(): WebsiteDigitalTwin[];
  clear(): void;
}

export class InMemoryTwinStore implements TwinStore {
  private readonly twinsById = new Map<string, WebsiteDigitalTwin>();
  private readonly latestTwinIdBySiteVersionId = new Map<string, string>();

  readonly diagnostics = [
    TWIN_STORE_DIAGNOSTICS.SAVE_SUCCEEDED,
    TWIN_STORE_DIAGNOSTICS.GET_SUCCEEDED,
    TWIN_STORE_DIAGNOSTICS.LIST_SUCCEEDED,
  ] as const;

  saveTwin(twin: WebsiteDigitalTwin): void {
    this.twinsById.set(twin.identity.twinId, twin);
    this.latestTwinIdBySiteVersionId.set(twin.identity.siteVersionId, twin.identity.twinId);
  }

  getTwin(twinId: string): WebsiteDigitalTwin | null {
    return this.twinsById.get(twinId) ?? null;
  }

  getTwinBySiteVersion(siteVersionId: string): WebsiteDigitalTwin | null {
    const twinId = this.latestTwinIdBySiteVersionId.get(siteVersionId);

    if (typeof twinId !== "string") {
      return null;
    }

    return this.twinsById.get(twinId) ?? null;
  }

  listTwins(): WebsiteDigitalTwin[] {
    return [...this.twinsById.values()];
  }

  clear(): void {
    this.twinsById.clear();
    this.latestTwinIdBySiteVersionId.clear();
  }
}
