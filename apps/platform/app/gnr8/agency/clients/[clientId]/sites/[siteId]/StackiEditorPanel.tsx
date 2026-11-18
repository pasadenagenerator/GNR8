"use client";

import { useVariantNavigation } from "./VariantNavigation";
import StackiAiTextPanel from "./StackiAiTextPanel";

import { readStackiResponse } from "@/gnr8/stacki/stacki-response";

import { useCallback, useEffect, useRef, useState } from "react";

type Session = { id: string; entryUrl: string; expiresAt: number; revision: number; sourceSha256?: string };
export default function StackiEditorPanel(props: {
  agencyId: string; clientId: string; siteId: string; siteVersionId: string;
  candidatePreparationEnabled?: boolean;
  aiAvailable?: boolean;
  storage?: 'GNR8' | 'GitHub';
}) {
  const destination = props.storage ?? 'GNR8';
  const variantPending = useVariantNavigation()?.pending ?? false;
  const endpoint = `/api/gnr8/agency/clients/${props.clientId}/sites/${props.siteId}/stacki-drafts/${props.siteVersionId}/session?agencyId=${props.agencyId}`;
  const key = `gnr8-stacki:${endpoint}`;
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(0);
  const confirmedSource = useRef<string | undefined>(undefined);
  const [saved, setSaved] = useState<{ revision: number; sha256: string } | null>(null);
  async function refreshSaved() {
    const url = endpoint.replace('/session?', '?') + '&verify=1';
    const response = await fetch(url, { cache: 'no-store' });
    const result = await readStackiResponse(response);
    if (!response.ok) throw new Error('Shranjene revizije ni mogoče preveriti.');
    setSaved(result.verification ? { revision: result.verification.revision, sha256: result.verification.checkpointSha256 } : null);
  }
  async function prepareCandidate() {
    if (!saved || busy) return;
    setBusy(true); setMessage(`Pošiljam revizijo ${saved.revision} v pripravo …`);
    try {
      const response = await fetch('/api/gnr8/site-actions', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agencyId: props.agencyId, siteId: props.siteId, actionType: 'generate_redesign',
          stackiRevision: { scope: { agencyId: props.agencyId, clientId: props.clientId, siteId: props.siteId, siteVersionId: props.siteVersionId }, ...saved } }) });
      const result = await readStackiResponse(response);
      if (!response.ok || !result.ok) throw new Error(result.error ?? result.result?.action?.resultSummary ?? 'Priprava ni uspela.');
      setMessage(`Priprava revizije ${saved.revision} je v čakalni vrsti. Spremljajte obstoječa dejanja strani; po zaključku v nastavitvah domene izberite novo različico Stacki, pripravite javni predogled in ga preglejte. Odobritev in Publish ostaneta vaši dejanji.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Priprava ni uspela.'); }
    finally { setBusy(false); }
  }
  async function prepareBaseline() {
    if (busy || session) return;
    setBusy(true); setMessage('Pripravljam zahtevo za novo uredljivo osnovo …');
    try {
      const response = await fetch('/api/gnr8/site-actions', {method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({agencyId:props.agencyId,siteId:props.siteId,actionType:'generate_redesign',
          stackiBaseline:{agencyId:props.agencyId,clientId:props.clientId,siteId:props.siteId,siteVersionId:props.siteVersionId}})});
      const result = await readStackiResponse(response);
      if (!response.ok || !result.ok) throw new Error(result.error ?? result.result?.action?.resultSummary ?? 'Priprava ni uspela.');
      setMessage('Priprava nove osnove je v čakalni vrsti. Ko se dejanje zaključi, izberite različico »Astro 7 · uredljiva osnova« in jo odprite v Stackiju. Sedanja različica ostane ohranjena; nova ni odobrena za objavo.');
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Priprava ni uspela.'); }
    finally { setBusy(false); }
  }
  const requestId = useRef<string | null>(null);
  const editor = useRef<Window | null>(null);
  const saving = useRef(false);
  const preparingPublication = useRef(false);
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
      revision: confirmedRevision.current, sourceSha256: confirmedSource.current }, origin);
    const receive = async (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== editor.current || event.data?.sessionId !== session.id) return;
      if (event.data.type === "gnr8:connected") { connected.current = true; return; }
      if (event.data.type === 'gnr8:git-history' && typeof event.data.requestId === 'string' &&
          /^[a-f0-9-]{36}$/.test(event.data.requestId)) {
        const reply = {type:'gnr8:git-history-result',sessionId:session.id,requestId:event.data.requestId};
        try {
          const response = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},
            body:JSON.stringify({action:'history',id:session.id})});
          const result = await readStackiResponse(response);
          editor.current?.postMessage({...reply,ok:response.ok,history:response.ok?result.history:undefined},origin);
        } catch { editor.current?.postMessage({...reply,ok:false},origin); }
        return;
      }
      if (event.data.type === 'gnr8:prepare-publication' && typeof event.data.requestId === 'string' &&
          /^[a-f0-9-]{36}$/.test(event.data.requestId) && Number.isInteger(event.data.revision)) {
        const reply = { type: 'gnr8:prepare-publication-result', sessionId: session.id, requestId: event.data.requestId };
        if (preparingPublication.current || saving.current || !props.candidatePreparationEnabled) {
          editor.current?.postMessage({ ...reply, ok: false, reason: 'Priprava trenutno ni na voljo.' }, origin);
          return;
        }
        preparingPublication.current = true; setBusy(true);
        try {
          const verificationResponse = await fetch(endpoint.replace('/session?', '?') + '&verify=1', { cache: 'no-store' });
          const verification = await readStackiResponse(verificationResponse);
          const latest = verification.verification;
          if (!verificationResponse.ok || !latest || latest.revision !== event.data.revision ||
              !/^[a-f0-9]{64}$/.test(latest.checkpointSha256))
            throw new Error('Shranjena revizija se je spremenila. Osvežite Stacki in znova preverite Save.');
          const response = await fetch('/api/gnr8/site-actions', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ agencyId: props.agencyId, siteId: props.siteId, actionType: 'generate_redesign',
              stackiRevision: { scope: { agencyId: props.agencyId, clientId: props.clientId, siteId: props.siteId,
                siteVersionId: props.siteVersionId }, revision: latest.revision, sha256: latest.checkpointSha256 } }) });
          const result = await readStackiResponse(response);
          if (!response.ok || !result.ok) throw new Error(result.error ?? result.result?.action?.resultSummary ?? 'Priprava ni uspela.');
          setSaved({ revision: latest.revision, sha256: latest.checkpointSha256 });
          setMessage(`Revizija ${latest.revision} je v pripravi za objavo. Po zaključku izberite novo različico v nastavitvah strani, preglejte javni predogled, jo odobrite in objavite na delovni domeni.`);
          editor.current?.postMessage({ ...reply, ok: true, revision: latest.revision }, origin);
          window.focus();
          document.querySelector('[aria-label="Stacki urejevalnik"]')?.scrollIntoView({ block: 'start' });
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Priprava ni uspela.';
          setMessage(reason);
          editor.current?.postMessage({ ...reply, ok: false, reason }, origin);
        } finally { preparingPublication.current = false; setBusy(false); }
        return;
      }
      if (event.data.type !== "gnr8:save" || saving.current ||
          typeof event.data.operationId !== "string" || !Number.isInteger(event.data.expectedRevision) ||
          typeof event.data.close !== "boolean") return;
      saving.current = true; setBusy(true); setMessage(`Shranjujem osnutek v ${destination} …`);
      let closed = false;
      const reply = { type: "gnr8:save-result", sessionId: session.id, operationId: event.data.operationId };
      try {
        const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: event.data.close ? "save-and-close" : "save", id: session.id,
            operationId: event.data.operationId, expectedRevision: event.data.expectedRevision }) });
        const result = await readStackiResponse(response);
        editor.current?.postMessage({ ...reply, ...result }, origin);
        if (!response.ok) throw new Error(result.reason === "STACKI_DRAFT_CONFLICT" ?
          "Druga seja je shranila novejši osnutek. Spremembe ostajajo v urejevalniku." :
          result.reason === 'STACKI_SESSION_EXPIRED' ?
            'Urejevalna seja je potekla. Odprite novo sejo Stacki iz zadnje potrjene revizije.' :
          result.reason === 'STACKI_DRAFT_STORAGE_UNAVAILABLE' ?
            'GitHub ni potrdil shranjevanja. Ponovite Save pred iztekom seje.' :
            "Shranjevanje ni potrjeno. V Stackiju ponovite Save.");
        closed = result.closed === true;
        confirmedRevision.current = result.revision;
        confirmedSource.current = result.sourceSha256;
        setSaved({ revision: result.revision, sha256: result.sha256 });
        setMessage(`Osnutek je shranjen v ${destination} (različica ${result.revision}).${closed ? " Seja je zaprta." : " Urejanje lahko nadaljujete."}`);
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
  }, [session, endpoint, clear, destination, props.agencyId, props.clientId, props.siteId,
    props.siteVersionId, props.candidatePreparationEnabled]);
  async function act(action: "open" | "save-and-close" | "discard") {
    if (variantPending || busy || saving.current) return;
    if (action === "save-and-close") {
      if (!session || !connected.current || !editor.current || editor.current.closed) {
        setMessage("Ponovno odprite urejevalnik, nato izberite Shrani in zapri."); return;
      }
      editor.current.postMessage({ type: "gnr8:request-save", sessionId: session.id }, new URL(session.entryUrl).origin);
      return;
    }
    if (action === "discard" && !window.confirm(`Zaprem sejo brez shranjevanja novih sprememb v ${destination}?`)) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try { sessionStorage.setItem(key, requestId.current); } catch { /* optional recovery hint */ }
    // Reserve a tab during the click so popup blockers do not swallow an async open.
    const tab = action === "open" ? window.open("about:blank", "_blank") : null;
    if(action === "open" && !tab){setMessage("Dovolite odpiranje novega zavihka za Stacki. Zagon ni bil zahtevan.");return;}
    const progress = (text:string) => {
      setMessage(text);
      if(tab){try{tab.document.title="Priprava Stackija";tab.document.body.textContent=text;}catch{/* editor has navigated */}}
    };
    if (tab) { tab.opener = null; editor.current = tab; }
    setBusy(true);
    progress(action === "open" ? "Preverjam sejo in pripravljene datoteke …" : "Zapiram sejo …");
    try {
      const send = async (body:Record<string,unknown>) => {
        const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
        return {response,result:await readStackiResponse(response)};
      };
      let {response,result}=await send({action,id:requestId.current});
      if(action==="open" && response.status===409 && result.reason==="STACKI_ASSETS_NOT_PREPARED"){
        let index=0,identity:string|null=null;
        for(;;){
          if(tab?.closed)throw new Error("Priprava je prekinjena. Preverjene datoteke so ohranjene; zagon ni bil rezerviran.");
          progress(`Pripravljam datoteke za urejevalnik (skupina ${index+1}). Zagon še ni rezerviran. Priprava vseh strani se izvede samo prvič …`);
          const step=await send({action:"prepare-assets",id:requestId.current,index,identity});
          if(!step.response.ok)throw new Error("Priprava datotek se je ustavila. Preverjene skupine so ohranjene; nov zagon ni bil rezerviran. Pred ponovitvijo preverimo vzrok.");
          const next=step.result;
          if(next.state!=="preparing-assets" || typeof next.identity!=="string" || (identity!==null&&identity!==next.identity) ||
              !Number.isInteger(next.total)||next.total<0||next.total>2000||
              !Number.isInteger(next.completed)||next.completed!==Math.min(index+1,next.total)||
              next.ready!==(next.completed===next.total))throw new Error("Priprave datotek ni mogoče potrditi.");
          identity=next.identity;
          progress(`Preverjene datoteke: ${next.completed}/${next.total} skupin. Zagon še ni rezerviran.`);
          if(next.ready)break;
          index=next.completed;
        }
        if(tab?.closed)throw new Error("Priprava je končana, zavihek pa je zaprt. Zagon ni bil rezerviran.");
        progress("Vse datoteke so pripravljene. Nalagam shranjeni osnutek in odpiram urejevalnik …");
        ({response,result}=await send({action,id:requestId.current}));
      }
      if (!response.ok) {
        if (action === "open" && response.status === 410 && result.reason === "STACKI_SESSION_EXPIRED") {
          // This reservation cannot be reopened. Keep the saved draft; the next
          // explicit Open must use a fresh ID instead of replaying this one.
          clear();
          throw new Error(`Seja je potekla. Zadnji potrjeno shranjen osnutek ostaja v ${destination}. Ponovno kliknite »Odpri v Stackiju« za novo sejo.`);
        }
        const messages: Record<string, string> = {
          STACKI_PREPARATION_TIMEOUT: "Nalaganje datotek je preseglo čas za pripravo. Nov zagon ni bil rezerviran. Pred ponovitvijo preverimo vzrok.",
          STACKI_SESSION_START_PENDING: "Seja se pripravlja ali zagon ni bil potrjen. Ponovite odpiranje; dodatne seje ne bomo ustvarili.",
          STACKI_CHECKPOINT_TOO_LARGE: "Ta stran presega omejitev osnutka (8 MB skupaj oziroma 1 MB na datoteko).",
          STACKI_SOURCE_PROJECT_UNAVAILABLE: "Izbrana različica nima podprtega shranjenega Astro projekta. Izberite obstoječo Astro različico.",
          STACKI_RUNTIME_REFRESH_REQUIRED: `Testno urejevalno okolje potrebuje obnovitev. Shranjeni osnutki ostajajo v ${destination}.`,
          STACKI_PILOT_LIMIT: "Dosežena je omejitev testnih zagonov za ta mesec.",
          STACKI_SESSION_EXPIRED: `Seja je potekla. V ${destination} je ostal zadnji potrjeno shranjen osnutek.`,
          STACKI_DRAFT_CONFLICT: "Osnutek je medtem spremenila druga seja. Vaših sprememb nismo prepisali.",
          STACKI_PILOT_ONLY: "Urejevalnik je trenutno na voljo samo za začetno testiranje.",
          STACKI_SESSIONS_DISABLED: "Spletni urejevalnik še ni vključen.",
        };
        throw new Error(messages[result.reason] ?? `Dejanja ni bilo mogoče potrditi. Shranjene revizije ostajajo v ${destination}. Pred ponovitvijo preverimo vzrok.`);
      }
      if (result.state === "editing") {
        const entry = new URL(result.entryUrl);
        if (entry.protocol !== "https:" && !(entry.protocol === "http:" && entry.hostname === "127.0.0.1")) throw new Error("Neveljavna povezava urejevalnika.");
        setSession({ id: result.id, entryUrl: result.entryUrl, expiresAt: result.expiresAt, revision: result.revision });
        confirmedRevision.current = result.revision;
        confirmedSource.current = result.sourceSha256;
        if (tab) tab.location.href = result.entryUrl;
        setMessage(`Urejevalnik je odprt. Save v Stackiju trajno shrani osnutek v ${destination}.`);
      } else {
        tab?.close();
        if (session) editor.current?.postMessage({ type: "gnr8:closed", sessionId: session.id }, new URL(session.entryUrl).origin);
        clear();
        setMessage(result.state === "saved" ? `Osnutek je shranjen v ${destination} (različica ${result.revision}). Lahko ga ponovno odprete.` : `Seja je zaprta. Zadnji shranjen osnutek ostaja v ${destination}.`);
      }
    } catch (error) {
      tab?.close(); setMessage(error instanceof Error ? error.message : "Povezava ni uspela. Poskusite znova.");
    } finally { setBusy(false); }
  }
  return <section aria-label="Stacki urejevalnik" style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
    <strong>Urejanje strani s Stackijem</strong>
    <p>Urejate osnutek izbrane različice. Save v Stackiju shrani osnutek v {destination} in omogoča nadaljnje urejanje.</p>
    <p>Priprava podpira spremembe statičnega besedila in slik (PNG, JPEG, WebP in statični SVG). Dovoljena je tudi odstranitev obvestila GNR8. Spremembe kode, navigacije, obrazcev in odzivnih slik s srcset niso podprte. Nepodprte spremembe ustavijo pripravo. Kanonična vsebina in dizajn se s temi izvornimi popravki ne sinhronizirata.</p>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button disabled={variantPending || busy || !!session || !props.candidatePreparationEnabled} onClick={() => void prepareBaseline()}>Pripravi novo osnovo Astro 7</button>
      <button disabled={variantPending || busy} onClick={() => void act("open")}>{session ? "Ponovno odpri urejevalnik" : "Odpri v Stackiju"}</button>
      <button disabled={variantPending || busy} onClick={() => void refreshSaved().catch(error => setMessage(error.message))}>Preveri shranjeno revizijo</button>
      <button disabled={variantPending || busy || !saved || !props.candidatePreparationEnabled} onClick={() => void prepareCandidate()}>Pripravi izbrano shranjeno revizijo</button>
      {(session || requestId.current) && <>
        <button disabled={variantPending || busy} onClick={() => void act("save-and-close")}>Shrani in zapri</button>
        <button disabled={variantPending || busy} onClick={() => void act("discard")}>Zapri brez shranjevanja</button>
      </>}
    </div>
    {saved && <p>Izbrana shranjena revizija: {saved.revision}<br />SHA-256: {saved.sha256}<br />Priprava uporabi to revizijo. Poznejše urejanje ne spreminja že pripravljenega ali odobrenega kandidata.</p>}
    <StackiAiTextPanel endpoint={endpoint} saved={saved} editorOpen={!!session} disabled={variantPending || busy}
      aiAvailable={props.aiAvailable === true} onApplied={(revision, sha256) => setSaved({ revision, sha256 })} />
    {!props.candidatePreparationEnabled && <p>Priprava kandidatov iz Stacki na tem okolju še ni vključena.</p>}
    {session && <>
      <p>Do izteka: {remaining} min. Potrditev »Saved to {destination}« pomeni trajno shranjen osnutek. Zapiranje brez shranjevanja ohrani vse že potrjene različice.</p>

    </>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
