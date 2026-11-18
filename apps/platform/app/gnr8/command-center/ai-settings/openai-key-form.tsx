"use client";

import React, { useEffect, useRef, useState, type FormEvent } from "react";

type ProviderStatus = {
  connected: boolean;
  maskedKey: string | null;
  model: string;
  status: string;
  lastTestStatus: "passed" | "failed" | null;
  canUseAiCommands: boolean;
};

const ENDPOINT = "/api/gnr8/admin/airship/ai/provider";
const MODEL = "gpt-5.4-mini-2026-03-17";

export function OpenAIKeyForm() {
  const keyInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(ENDPOINT, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const body = await response.json();
        if (active && response.ok && body.ok) setStatus(body.providerStatus);
      })
      .catch(() => {
        if (active) setMessage("Stanja povezave ni mogoče prebrati.");
      });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const apiKey = keyInput.current?.value.trim() ?? "";
    if (!apiKey || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actionMode: "save_openai", apiKey, model: MODEL }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error("save_failed");
      setStatus(body.providerStatus);
      setMessage("Ključ je varno shranjen. Testni API klic še ni bil izveden.");
    } catch {
      setMessage("Ključa ni bilo mogoče shraniti. Preveri strežniške nastavitve in poskusi znova.");
    } finally {
      if (keyInput.current) keyInput.current.value = "";
      setBusy(false);
    }
  }

  return (
    <section style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 16 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Ključ OpenAI za GNR8</h2>
      <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 13 }}>
        Vnesi nov ključ projekta GNR8 z dovoljenjem Model capabilities: Request. Shramba ključa ne sproži API klica.
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 13 }}>
        Stanje: {status?.connected ? `shranjen ključ (${status.maskedKey ?? "skrito"})` : status?.status ?? "preverjam"}.
        {status?.connected ? ` Shranjeni model: ${status.model}.` : ""}
        {status?.lastTestStatus === "failed" ? " Zadnji preizkus ni uspel." : ""}
        {status?.connected && !status.canUseAiCommands ? " AI klici so izklopljeni." : ""}
        {` Novi ključ bo uporabljal ${MODEL}.`}
      </p>
      <form onSubmit={save} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 5, flex: "1 1 320px", fontSize: 13 }}>
          API ključ
          <input ref={keyInput} type="password" required autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            style={{ width: "100%", padding: 9, border: "1px solid #cbd5e1", borderRadius: 6 }} />
        </label>
        <button type="submit" disabled={busy} style={{ padding: "10px 14px", borderRadius: 6, border: 0, background: "#0f766e", color: "white", cursor: "pointer" }}>
          {busy ? "Shranjujem …" : "Shrani ključ"}
        </button>
      </form>
      <p role="status" aria-live="polite" style={{ minHeight: 20, margin: "10px 0 0", color: "#334155", fontSize: 13 }}>{message}</p>
    </section>
  );
}
