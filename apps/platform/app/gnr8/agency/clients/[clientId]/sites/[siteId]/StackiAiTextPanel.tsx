"use client";

import { useState } from "react";

type Proposal = { revision: number; sha256: string; original: string; replacement: string };
const errors: Record<string, string> = {
  STACKI_AI_DISABLED: "AI je trenutno izklopljen. Shranjene osnutke lahko še naprej urejate v Stackiju.",
  STACKI_DRAFT_CONFLICT: "Osnutek se je medtem spremenil. Preverite shranjeno revizijo in pripravite nov predlog.",
  STACKI_AI_TEXT_NOT_FOUND: "Besedilo ni enkratno statično besedilo v naslovu, odstavku ali gumbu prve strani.",
  STACKI_AI_TEXT_AMBIGUOUS: "Besedilo se pojavi večkrat. Izberite daljši, enoličen odlomek.",
  STACKI_AI_TEXT_INVALID: "Vnesite kratko besedilo brez oznak HTML, zavitih oklepajev in preloma vrstice.",
  STACKI_AI_RESPONSE_INVALID: "Predlog ni bil veljaven. Osnutek ni bil spremenjen.",
};

export default function StackiAiTextPanel(props: {
  endpoint: string; saved: { revision: number; sha256: string } | null;
  editorOpen: boolean; disabled: boolean; aiAvailable: boolean;
  onApplied(revision: number, sha256: string): void;
}) {
  const [original, setOriginal] = useState("");
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const endpoint = props.endpoint.replace("/session?", "/ai-text?");
  async function send(body: Record<string, unknown>) {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(errors[result.reason] ?? "Dejanja ni mogoče dokončati. Osnutek ni bil spremenjen.");
    return result;
  }
  async function propose() {
    if (!props.saved || busy || props.disabled || props.editorOpen || !props.aiAvailable) return;
    setBusy(true); setProposal(null); setMessage("Pripravljam predlog …");
    try {
      const result = await send({ action: "propose", ...props.saved, original: original.trim(), instruction: instruction.trim() });
      setProposal({ revision: result.revision, sha256: result.sha256, original: result.original, replacement: result.replacement });
      setMessage("Preglejte predlog. Osnutek se še ni spremenil.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Predlog ni uspel."); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!proposal || !props.saved || busy || props.disabled || props.editorOpen ||
        proposal.revision !== props.saved.revision || proposal.sha256 !== props.saved.sha256) return;
    setBusy(true); setMessage("Shranjujem potrjeno spremembo …");
    try {
      const result = await send({ action: "apply", ...proposal });
      props.onApplied(result.revision, result.sha256);
      setProposal(null);
      setMessage(`Sprememba je shranjena kot revizija ${result.revision}. Odprite osnutek v Stackiju za pregled strani.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Spremembe ni bilo mogoče shraniti."); }
    finally { setBusy(false); }
  }
  return <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 16, display: "grid", gap: 8 }}>
    <strong>AI predlog za besedilo v Stacki osnutku</strong>
    <p>Vnesite obstoječe besedilo s prve strani in navodilo za spremembo. AI pripravi predlog; osnutek se spremeni šele po vaši potrditvi.</p>
    <label>Obstoječe besedilo<br /><input value={original} maxLength={300} onChange={event => { setOriginal(event.target.value); setProposal(null); }} style={{ width: "100%" }} /></label>
    <label>Navodilo za AI<br /><input value={instruction} maxLength={600} onChange={event => { setInstruction(event.target.value); setProposal(null); }} style={{ width: "100%" }} /></label>
    <div><button disabled={!props.aiAvailable || !props.saved || props.editorOpen || props.disabled || busy || !original.trim() || !instruction.trim()} onClick={() => void propose()}>Pripravi AI predlog</button></div>
    {proposal && <div aria-label="Predogled AI predloga" style={{ border: "1px solid #cbd5e1", padding: 12 }}>
      <p><strong>Prej:</strong> {proposal.original}</p><p><strong>Predlog:</strong> {proposal.replacement}</p>
      <button disabled={props.editorOpen || props.disabled || busy || proposal.revision !== props.saved?.revision || proposal.sha256 !== props.saved?.sha256}
        onClick={() => void apply()}>Potrdi in shrani v osnutek</button>
    </div>}
    {props.editorOpen && <p>Pred uporabo AI predloga shranite in zaprite odprto sejo Stacki.</p>}
    {!props.saved && <p>Najprej shranite osnutek in kliknite »Preveri shranjeno revizijo«.</p>}
    {!props.aiAvailable && <p>AI klici so trenutno izklopljeni.</p>}
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
