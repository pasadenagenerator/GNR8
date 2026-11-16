/** Copied into the pinned Studio build. No GNR8 cookie or storage key enters it.
 * Only the matching GNR8 window can service commands over the origin-bound bridge. */
import { useEffect, useState } from "react";

type Document = { whenSaved(): Promise<void> };
type Config = { platformOrigin: string; sessionId: string; revision: number; storage?: 'gnr8' | 'github'; sourceUnchanged?: boolean; sourceSha256?: string };
type Operation = { operationId: string; expectedRevision: number; generation: number };
type Receipt = { revision: number; sha256: string; sourceSha256?: string; closed?: boolean };
let confirmedSource: { revision:number; sourceSha256:string } | undefined;
const documents = new Set<Document>();
const listeners = new Set<() => void>();
let generation = 0, revision = 0, requests = 0;
let config: Config | undefined, platform: Window | undefined;
let busy = false, sessionClosed = false, status = "Connecting to GNR8", pending: Operation | undefined, lastSaved: Operation | undefined;
let reply: { id: string; resolve(value: Receipt): void; reject(error: Error): void } | undefined;
type GitEntry = {revision:number;sha256:string;commit:string};
const gitReplies = new Map<string,{resolve(value:GitEntry[]):void;reject(error:Error):void;timer:ReturnType<typeof setTimeout>}>();
const publicationReplies = new Map<string,{resolve(value:number):void;reject(error:Error):void;timer:ReturnType<typeof setTimeout>}>();
const emit = () => listeners.forEach(listener => listener());
const destination = () => config?.storage === 'github' ? 'GitHub' : 'GNR8';
export function registerGnr8Document(document: Document) { documents.add(document); if (config) void verifyRestoredSource(); }
export function gnr8Dirty() { generation++; if (!busy && !status.startsWith("Save failed")) status = "Unsaved changes"; emit(); }
export function gnr8Request(options?: RequestInit) {
  const mutation = options?.method && !["GET", "HEAD"].includes(options.method.toUpperCase());
  if (mutation) { requests++; gnr8Dirty(); }
  return () => { if (mutation) requests--; };
}
export function requestGnr8GitHistory():Promise<GitEntry[]> {
  return new Promise((resolve,reject) => {
    if (!config || !platform || config.storage !== 'github') {
      reject(new Error('GitHub history is not connected to this GNR8 session.')); return;
    }
    const requestId=crypto.randomUUID();
    const timer=setTimeout(() => {gitReplies.delete(requestId);reject(new Error('GitHub history did not respond. Retry.'));},30_000);
    gitReplies.set(requestId,{resolve,reject,timer});
    platform.postMessage({type:'gnr8:git-history',sessionId:config.sessionId,requestId},config.platformOrigin);
  });
}
function requestGnr8Publication(savedRevision:number):Promise<number> {
  return new Promise((resolve,reject) => {
    if (!config || !platform || config.storage !== 'github') {
      reject(new Error('Keep the GNR8 tab open and reconnect the editor.')); return;
    }
    const requestId=crypto.randomUUID();
    const timer=setTimeout(() => {publicationReplies.delete(requestId);reject(new Error('GNR8 did not confirm preparation. Check the site action before retrying.'));},30_000);
    publicationReplies.set(requestId,{resolve,reject,timer});
    platform.postMessage({type:'gnr8:prepare-publication',sessionId:config.sessionId,requestId,revision:savedRevision},config.platformOrigin);
  });
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
  busy = true; status = `Saving to ${destination()}`; emit();
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
    const unchanged = generation === operation.generation || await matchesConfirmedSource(result.sourceSha256);
    if (result.sourceSha256 && /^[a-f0-9]{64}$/.test(result.sourceSha256)) confirmedSource = {revision,sourceSha256:result.sourceSha256};
    lastSaved = unchanged ? {...operation,generation} : operation;
    pending = undefined; sessionStorage.removeItem("gnr8:pending-save");
    status = unchanged ? `Saved to ${destination()} · revision ${revision}` : "Unsaved changes";
    try { if (typeof Event !== 'undefined') window.dispatchEvent(new Event('gnr8:save-confirmed')); }
    catch { /* history refresh cannot invalidate a durable Save receipt */ }
    if (close) {
      if (!unchanged) throw new Error("Earlier save recovered. Save your newer edits before closing.");
      // Close retries use the same confirmed operation and never add a revision.
      pending = operation; sessionStorage.setItem("gnr8:pending-save", JSON.stringify(operation));
      await persist(operation, true);
      pending = undefined; sessionStorage.removeItem("gnr8:pending-save");
      status = `Saved to ${destination()} · revision ${revision} · closed`;
      sessionClosed = true;
      window.close();
    }
  } catch (error) {
    status = `Save failed: ${error instanceof Error ? error.message : "Retry Save."}`;
  } finally { if (root) root.inert = false; busy = false; emit(); }
}
async function matchesConfirmedSource(sourceSha256?:string):Promise<boolean> {
  if (!sourceSha256 || !/^[a-f0-9]{64}$/.test(sourceSha256)) return false;
  const checkedGeneration=generation;
  try {
    await Promise.all([...documents].map(document=>document.whenSaved()));
    const response=await fetch("/studio/api/gnr8-persistence");
    if(!response.ok)return false;
    const current:Config=await response.json();
    return !requests && generation===checkedGeneration && current.sessionId===config?.sessionId && current.sourceSha256===sourceSha256;
  } catch { return false; }
}
// A fresh runtime is clean only after the real writer queue matches the restored
// source. Never infer durability from readiness, a revision number or editor metadata.
async function verifyRestoredSource() {
  if (!config || pending || busy || lastSaved || !documents.size) return;
  const sessionId = config.sessionId, checkedGeneration = generation;
  try {
    const start = Date.now();
    while (requests) {
      if (Date.now() - start > 15_000) throw new Error("Change still pending");
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await Promise.all([...documents].map(document => document.whenSaved()));
    const response = await fetch("/studio/api/gnr8-persistence");
    if (!response.ok) throw new Error("Cannot verify restored source");
    const state: Config = await response.json();
    if (generation !== checkedGeneration || requests || pending || busy || lastSaved || state.sessionId !== sessionId) return;
    const matches = confirmedSource?.revision === revision
      ? state.sourceSha256 === confirmedSource.sourceSha256
      : state.sourceUnchanged && state.revision === revision;
    status = matches
      ? `Saved to ${destination()} · revision ${revision}` : "Unsaved changes";
    emit();
  } catch { if (generation === checkedGeneration && !pending && !busy && !lastSaved) { status = "Saved state unverified · retry Save"; emit(); } }
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
    void verifyRestoredSource();
  }).catch(error => { status = `Save unavailable: ${error.message}`; emit(); });
  window.addEventListener("message", event => {
    if (!config || event.origin !== config.platformOrigin || !event.source ||
        event.data?.sessionId !== config.sessionId) return;
    if (event.data.type === "gnr8:connect" && (!platform || event.source === platform)) {
      if (!platform && !pending && Number.isInteger(event.data.revision) && event.data.revision >= revision &&
          event.data.revision <= 64) revision = event.data.revision;
      const source = event.data.sourceSha256;
      const changedReceipt = /^[a-f0-9]{64}$/.test(source ?? "") && Number.isInteger(event.data.revision) &&
        event.data.revision === revision && (confirmedSource?.revision !== revision || confirmedSource?.sourceSha256 !== source);
      if (changedReceipt) confirmedSource = {revision,sourceSha256:source};
      platform = event.source as Window;
      if (changedReceipt) void verifyRestoredSource();
      platform.postMessage({ type: "gnr8:connected", sessionId: config.sessionId }, config.platformOrigin);
      emit();
    }
    if (event.source !== platform) return;
    if (event.data.type === 'gnr8:git-history-result') {
      const waiting=gitReplies.get(event.data.requestId);
      if (waiting) {
        gitReplies.delete(event.data.requestId);clearTimeout(waiting.timer);
        if (event.data.ok && Array.isArray(event.data.history) && event.data.history.length<=20 &&
            event.data.history.every((item:GitEntry) => Number.isInteger(item.revision) &&
              /^[a-f0-9]{64}$/.test(item.sha256) && /^[a-f0-9]{40}$/.test(item.commit)))
          waiting.resolve(event.data.history);
        else waiting.reject(new Error('GitHub history is unavailable. Retry.'));
      }
      return;
    }
    if (event.data.type === 'gnr8:prepare-publication-result') {
      const waiting=publicationReplies.get(event.data.requestId);
      if (waiting) {
        publicationReplies.delete(event.data.requestId);clearTimeout(waiting.timer);
        if (event.data.ok && Number.isInteger(event.data.revision)) waiting.resolve(event.data.revision);
        else waiting.reject(new Error(typeof event.data.reason === 'string' ? event.data.reason : 'GNR8 could not prepare this revision.'));
      }
      return;
    }
    if (event.data.type === "gnr8:closed") { sessionClosed = true; window.close(); }
    if (event.data.type === "gnr8:request-save") void save(true);
    if (event.data.type === "gnr8:save-result" && reply && reply.id === event.data.operationId) {
      const current = reply; reply = undefined;
      if (event.data.ok) current.resolve(event.data);
      else current.reject(new Error(event.data.reason === "STACKI_DRAFT_CONFLICT" ||
          event.data.reason === "STACKI_SAVE_OPERATION_CONFLICT"
        ? "Conflicting revision. Your edits remain here; no newer draft was overwritten."
        : event.data.reason === 'STACKI_SESSION_EXPIRED'
          ? 'This editing session expired. Open a new Stacki session from GNR8.'
          : event.data.reason === 'STACKI_DRAFT_STORAGE_UNAVAILABLE'
            ? 'GitHub storage did not confirm this Save. Retry before the session expires.'
            : "Save not confirmed. Retry before this session expires."));
    }
  });
  window.addEventListener("beforeunload", event => {
    if (!sessionClosed && (!status.startsWith(`Saved to ${destination()}`) || busy || pending)) { event.preventDefault(); event.returnValue = ""; }
  });
}
export function Gnr8Save() {
  const [, render] = useState(0);
  useEffect(() => { const update = () => render(value => value + 1); listeners.add(update); initialize();
    return () => { listeners.delete(update); }; }, []);
  return <>
    <button onClick={() => void save()} disabled={busy || !platform} title={`Save a private draft in ${destination()}`}>Save</button>
    <span className="save-state" role="status">{status}</span>
    {busy && <div role="dialog" aria-label={`Saving to ${destination()}`} aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 999999, background: "#111b", display: "grid", placeItems: "center" }}>
      Saving to {destination()}…
    </div>}
  </>;
}

export function Gnr8Publish() {
  const [, render] = useState(0);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [preparedRevision, setPreparedRevision] = useState<number>();
  useEffect(() => { const update = () => render(value => value + 1); listeners.add(update);
    return () => { listeners.delete(update); }; }, []);
  const saved = status === `Saved to GitHub · revision ${revision}` && !busy && !pending && !requests;
  async function prepare() {
    if (!saved || submitting || preparedRevision === revision) return;
    setSubmitting(true); setMessage('GNR8 preverja shranjeno revizijo …');
    try {
      const prepared = await requestGnr8Publication(revision);
      setPreparedRevision(prepared);
      setMessage(`Revizija ${prepared} je v pripravi v GNR8. Nadaljujte v zavihku GNR8: preglejte izdajo, jo odobrite in nato objavite na delovni domeni.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Priprava ni uspela.'); }
    finally { setSubmitting(false); }
  }
  return <div className="publish-control">
    <button className="primary" onClick={() => { setMessage(''); setOpen(true); }}>Publish</button>
    {open && <div role="dialog" aria-modal="true" aria-label="Publish with GNR8"
      style={{position:'fixed',inset:0,zIndex:999999,background:'#111c',display:'grid',placeItems:'center'}}>
      <div style={{background:'#181818',color:'white',border:'1px solid #555',borderRadius:12,padding:24,maxWidth:460,display:'grid',gap:14}}>
        <h2 style={{margin:0}}>Publish with GNR8</h2>
        <p style={{margin:0}}>GNR8 pripravi shranjeno GitHub revizijo. Pred objavo na delovni domeni boste pregledali predogled in odobrili točno izdajo.</p>
        <p style={{margin:0}}>{saved ? `Shranjena revizija ${revision}` : 'Najprej kliknite Save in počakajte na potrditev »Saved to GitHub«.'}</p>
        {message && <p role="status" style={{margin:0}}>{message}</p>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={() => setOpen(false)} disabled={submitting}>Zapri</button>
          <button className="primary" onClick={() => void prepare()} disabled={!saved || submitting || !platform || preparedRevision === revision}>Pripravi v GNR8</button>
        </div>
      </div>
    </div>}
  </div>;
}
