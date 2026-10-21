"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Session = { id: string; entryUrl: string; expiresAt: number; revision: number };
export default function StackiEditorPanel(props: {
  agencyId: string; clientId: string; siteId: string; siteVersionId: string;
}) {
  const endpoint = `/api/gnr8/agency/clients/${props.clientId}/sites/${props.siteId}/stacki-drafts/${props.siteVersionId}/session?agencyId=${props.agencyId}`;
  const key = `gnr8-stacki:${endpoint}`;
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(0);
  const requestId = useRef<string | null>(null);
  const editor = useRef<Window | null>(null);
  const saving = useRef(false);
  const connected = useRef(false);
  const confirmedRevision = useRef(0);
  useEffect(() => {
    try {
      const id = sessionStorage.getItem(key);
      if (id) { requestId.current = id; setMessage("Prejšnjo sejo lahko ponovno odprete ali poskusite shraniti."); }
    } catch { /* session recovery also works while this panel stays mounted */ }
  }, [key]);
  useEffect(() => {
    if (!session) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60_000)));
    tick(); const timer = setInterval(tick, 1000);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { clearInterval(timer); window.removeEventListener("beforeunload", warn); };
  }, [session]);
  const clear = useCallback(() => {
    setSession(null); requestId.current = null;
    try { sessionStorage.removeItem(key); } catch { /* optional recovery hint */ }
  }, [key]);
  useEffect(() => {
    if (!session) return;
    const origin = new URL(session.entryUrl).origin;
    connected.current = false;
    const connect = () => editor.current?.postMessage({ type: "gnr8:connect", sessionId: session.id,
      revision: confirmedRevision.current }, origin);
    const receive = async (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== editor.current || event.data?.sessionId !== session.id) return;
      if (event.data.type === "gnr8:connected") { connected.current = true; return; }
      if (event.data.type !== "gnr8:save" || saving.current ||
          typeof event.data.operationId !== "string" || !Number.isInteger(event.data.expectedRevision) ||
          typeof event.data.close !== "boolean") return;
      saving.current = true; setBusy(true); setMessage("Shranjujem osnutek v GNR8 …");
      let closed = false;
      const reply = { type: "gnr8:save-result", sessionId: session.id, operationId: event.data.operationId };
      try {
        const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: event.data.close ? "save-and-close" : "save", id: session.id,
            operationId: event.data.operationId, expectedRevision: event.data.expectedRevision }) });
        const result = await response.json();
        editor.current?.postMessage({ ...reply, ...result }, origin);
        if (!response.ok) throw new Error(result.reason === "STACKI_DRAFT_CONFLICT" ?
          "Druga seja je shranila novejši osnutek. Spremembe ostajajo v urejevalniku." : "Shranjevanje ni potrjeno. V Stackiju ponovite Save.");
        closed = result.closed === true;
        confirmedRevision.current = result.revision;
        setMessage(`Osnutek je shranjen v GNR8 (različica ${result.revision}).${closed ? " Seja je zaprta." : " Urejanje lahko nadaljujete."}`);
      } catch (error) {
        editor.current?.postMessage({ ...reply, ok: false, reason: "STACKI_SAVE_UNCONFIRMED" }, origin);
        setMessage(error instanceof Error ? error.message : "Shranjevanje ni potrjeno. Ponovite Save.");
      } finally {
        saving.current = false; setBusy(false);
        if (closed) clear();
      }
    };
    window.addEventListener("message", receive);
    connect(); const timer = setInterval(connect, 1000);
    return () => { window.removeEventListener("message", receive); clearInterval(timer); };
  }, [session, endpoint, clear]);
  async function act(action: "open" | "save-and-close" | "discard") {
    if (busy || saving.current) return;
    if (action === "save-and-close") {
      if (!session || !connected.current || !editor.current || editor.current.closed) {
        setMessage("Ponovno odprite urejevalnik, nato izberite Shrani in zapri."); return;
      }
      editor.current.postMessage({ type: "gnr8:request-save", sessionId: session.id }, new URL(session.entryUrl).origin);
      return;
    }
    if (action === "discard" && !window.confirm("Zaprem sejo brez shranjevanja novih sprememb v GNR8?")) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try { sessionStorage.setItem(key, requestId.current); } catch { /* optional recovery hint */ }
    // Reserve a tab during the click so popup blockers do not swallow an async open.
    const tab = action === "open" ? window.open("about:blank", "_blank") : null;
    if (tab) { tab.opener = null; editor.current = tab; }
    setBusy(true);
    setMessage(action === "open" ? "Pripravljam urejevalnik …" : "Zapiram sejo …");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          STACKI_SESSION_START_PENDING: "Seja se pripravlja ali zagon ni bil potrjen. Ponovite odpiranje; dodatne seje ne bomo ustvarili.",
          STACKI_CHECKPOINT_TOO_LARGE: "Ta stran presega omejitev osnutka (8 MB skupaj oziroma 1 MB na datoteko).",
          STACKI_SOURCE_PROJECT_UNAVAILABLE: "Izbrana različica nima podprtega shranjenega Astro projekta. Izberite obstoječo Astro različico.",
          STACKI_RUNTIME_REFRESH_REQUIRED: "Testno urejevalno okolje potrebuje obnovitev. Shranjeni osnutki ostajajo v GNR8.",
          STACKI_PILOT_LIMIT: "Dosežena je omejitev testnih zagonov za ta mesec.",
          STACKI_SESSION_EXPIRED: "Seja je potekla. V GNR8 je ostal zadnji potrjeno shranjen osnutek.",
          STACKI_DRAFT_CONFLICT: "Osnutek je medtem spremenila druga seja. Vaših sprememb nismo prepisali.",
          STACKI_PILOT_ONLY: "Urejevalnik je trenutno na voljo samo za začetno testiranje.",
          STACKI_SESSIONS_DISABLED: "Spletni urejevalnik še ni vključen.",
        };
        throw new Error(messages[result.reason] ?? "Dejanja ni bilo mogoče potrditi. Poskusite znova pred iztekom seje.");
      }
      if (result.state === "editing") {
        const entry = new URL(result.entryUrl);
        if (entry.protocol !== "https:" && !(entry.protocol === "http:" && entry.hostname === "127.0.0.1")) throw new Error("Neveljavna povezava urejevalnika.");
        setSession({ id: result.id, entryUrl: result.entryUrl, expiresAt: result.expiresAt, revision: result.revision });
        confirmedRevision.current = result.revision;
        if (tab) tab.location.href = result.entryUrl;
        setMessage("Urejevalnik je odprt. Save v Stackiju trajno shrani osnutek v GNR8.");
      } else {
        tab?.close();
        if (session) editor.current?.postMessage({ type: "gnr8:closed", sessionId: session.id }, new URL(session.entryUrl).origin);
        clear();
        setMessage(result.state === "saved" ? `Osnutek je shranjen v GNR8 (različica ${result.revision}). Lahko ga ponovno odprete.` : "Seja je zaprta. Zadnji shranjen osnutek ostaja v GNR8.");
      }
    } catch (error) {
      tab?.close(); setMessage(error instanceof Error ? error.message : "Povezava ni uspela. Poskusite znova.");
    } finally { setBusy(false); }
  }
  return <section aria-label="Stacki urejevalnik" style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
    <strong>Urejanje strani s Stackijem</strong>
    <p>Urejate osnutek izbrane različice. Save v Stackiju shrani osnutek v GNR8 in omogoča nadaljnje urejanje.</p>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button disabled={busy} onClick={() => void act("open")}>{session ? "Ponovno odpri urejevalnik" : "Odpri v Stackiju"}</button>
      {(session || requestId.current) && <>
        <button disabled={busy} onClick={() => void act("save-and-close")}>Shrani in zapri</button>
        <button disabled={busy} onClick={() => void act("discard")}>Zapri brez shranjevanja</button>
      </>}
    </div>
    {session && <>
      <p>Do izteka: {remaining} min. Potrditev »Saved to GNR8« pomeni trajno shranjen osnutek. Zapiranje brez shranjevanja ohrani vse že potrjene različice.</p>

    </>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
