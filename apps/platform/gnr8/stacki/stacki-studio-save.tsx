/** Copied into the pinned Studio build. No GNR8 cookie or storage key enters it.
 * Only the matching GNR8 window can service commands over the origin-bound bridge. */
import { useEffect, useState } from "react";

type Document = { whenSaved(): Promise<void> };
type Config = { platformOrigin: string; sessionId: string; revision: number };
type Operation = { operationId: string; expectedRevision: number; generation: number };
type Receipt = { revision: number; sha256: string; closed?: boolean };
const documents = new Set<Document>();
const listeners = new Set<() => void>();
let generation = 0, revision = 0, requests = 0;
let config: Config | undefined, platform: Window | undefined;
let busy = false, sessionClosed = false, status = "Connecting to GNR8", pending: Operation | undefined, lastSaved: Operation | undefined;
let reply: { id: string; resolve(value: Receipt): void; reject(error: Error): void } | undefined;
const emit = () => listeners.forEach(listener => listener());
export function registerGnr8Document(document: Document) { documents.add(document); }
export function gnr8Dirty() { generation++; if (!busy && !status.startsWith("Save failed")) status = "Unsaved changes"; emit(); }
export function gnr8Request(options?: RequestInit) {
  const mutation = options?.method && !["GET", "HEAD"].includes(options.method.toUpperCase());
  if (mutation) { requests++; gnr8Dirty(); }
  return () => { if (mutation) requests--; };
}
function persist(operation: Operation, close = false) {
  return new Promise<Receipt>((resolve, reject) => {
    if (!config || !platform) { reject(new Error("Keep the GNR8 tab open and reconnect the editor.")); return; }
    const timer = setTimeout(() => {
      reply = undefined;
      reject(new Error("Save not confirmed. Retry Save; your edits remain here."));
    }, 150_000);
    reply = { id: operation.operationId, resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); } };
    platform.postMessage({ type: "gnr8:save", sessionId: config.sessionId, operationId: operation.operationId,
      expectedRevision: operation.expectedRevision, close }, config.platformOrigin);
  });
}
async function save(close = false) {
  if (busy) return;
  busy = true; status = "Saving to GNR8"; emit();
  const root = window.document.getElementById("root");
  if (root) root.inert = true;
  try {
    if (!config || !platform) throw new Error("Keep the GNR8 tab open and reconnect the editor.");
    if (!pending) {
      const start = Date.now();
      while (requests) {
        if (Date.now() - start > 15_000) throw new Error("Wait for the current change to finish, then retry Save.");
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      await Promise.all([...documents].map(document => document.whenSaved()));
      pending = lastSaved?.generation === generation ? lastSaved :
        { operationId: crypto.randomUUID(), expectedRevision: revision, generation };
      sessionStorage.setItem("gnr8:pending-save", JSON.stringify(pending));
    }
    const operation = pending;
    const result = await persist(operation);
    if (result.revision !== operation.expectedRevision + 1 || !/^[a-f0-9]{64}$/.test(result.sha256))
      throw new Error("GNR8 returned an invalid save receipt.");
    revision = result.revision;
    sessionStorage.setItem("gnr8:revision", String(revision));
    const unchanged = generation === operation.generation;
    lastSaved = operation;
    pending = undefined; sessionStorage.removeItem("gnr8:pending-save");
    status = unchanged ? `Saved to GNR8 · revision ${revision}` : "Unsaved changes";
    if (close) {
      if (!unchanged) throw new Error("Earlier save recovered. Save your newer edits before closing.");
      // Close retries use the same confirmed operation and never add a revision.
      pending = operation; sessionStorage.setItem("gnr8:pending-save", JSON.stringify(operation));
      await persist(operation, true);
      pending = undefined; sessionStorage.removeItem("gnr8:pending-save");
      status = `Saved to GNR8 · revision ${revision} · closed`;
      sessionClosed = true;
      window.close();
    }
  } catch (error) {
    status = `Save failed: ${error instanceof Error ? error.message : "Retry Save."}`;
  } finally { if (root) root.inert = false; busy = false; emit(); }
}
let initialized = false;
function initialize() {
  if (initialized) return;
  initialized = true;
  void fetch("/studio/api/gnr8-persistence").then(async response => {
    if (!response.ok) throw new Error("GNR8 save is not configured.");
    config = await response.json(); revision = config!.revision;
    const restoredRevision = Number(sessionStorage.getItem("gnr8:revision"));
    if (Number.isInteger(restoredRevision) && restoredRevision >= revision && restoredRevision <= 64) revision = restoredRevision;
    // Reloaded local edits must not be labeled durable just because the runtime is ready.
    status = "Unsaved changes";
    const stored = sessionStorage.getItem("gnr8:pending-save");
    if (stored) {
      pending = JSON.parse(stored);
      pending!.generation = -1;
      status = "Save not confirmed · retry Save";
    }
    emit();
  }).catch(error => { status = `Save unavailable: ${error.message}`; emit(); });
  window.addEventListener("message", event => {
    if (!config || event.origin !== config.platformOrigin || !event.source ||
        event.data?.sessionId !== config.sessionId) return;
    if (event.data.type === "gnr8:connect" && (!platform || event.source === platform)) {
      if (!platform && !pending && Number.isInteger(event.data.revision) && event.data.revision >= revision &&
          event.data.revision <= 64) revision = event.data.revision;
      platform = event.source as Window;
      platform.postMessage({ type: "gnr8:connected", sessionId: config.sessionId }, config.platformOrigin);
      emit();
    }
    if (event.source !== platform) return;
    if (event.data.type === "gnr8:closed") { sessionClosed = true; window.close(); }
    if (event.data.type === "gnr8:request-save") void save(true);
    if (event.data.type === "gnr8:save-result" && reply && reply.id === event.data.operationId) {
      const current = reply; reply = undefined;
      if (event.data.ok) current.resolve(event.data);
      else current.reject(new Error(event.data.reason === "STACKI_DRAFT_CONFLICT" ||
          event.data.reason === "STACKI_SAVE_OPERATION_CONFLICT"
        ? "Conflicting revision. Your edits remain here; no newer draft was overwritten."
        : "Save not confirmed. Retry before this session expires."));
    }
  });
  window.addEventListener("beforeunload", event => {
    if (!sessionClosed && (!status.startsWith("Saved to GNR8") || busy || pending)) { event.preventDefault(); event.returnValue = ""; }
  });
}
export function Gnr8Save() {
  const [, render] = useState(0);
  useEffect(() => { const update = () => render(value => value + 1); listeners.add(update); initialize();
    return () => { listeners.delete(update); }; }, []);
  return <>
    <button onClick={() => void save()} disabled={busy || !platform} title="Save a private draft in GNR8">Save</button>
    <span className="save-state" role="status">{status}</span>
    {busy && <div role="dialog" aria-label="Saving to GNR8" aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 999999, background: "#111b", display: "grid", placeItems: "center" }}>
      Saving to GNR8…
    </div>}
  </>;
}
