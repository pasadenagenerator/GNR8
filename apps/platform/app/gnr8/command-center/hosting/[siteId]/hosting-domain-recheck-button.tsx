"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { gnr8VisualTokens } from "../../../../../gnr8/visual-system/gnr8-visual-system";

export function HostingDomainRecheckButton(props: {
  siteId: string;
  domainId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "failed">("idle");

  async function recheck() {
    setState("running");
    const response = await fetch(
      `/api/gnr8/admin/hosting-operations/${encodeURIComponent(props.siteId)}/domains/${encodeURIComponent(props.domainId)}/recheck`,
      {
        method: "POST",
      },
    ).catch(() => null);

    if (!response?.ok) {
      setState("failed");
      return;
    }

    setState("idle");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <button
        type="button"
        onClick={recheck}
        disabled={state === "running"}
        style={{
          border: `1px solid ${gnr8VisualTokens.color.accentOrange}`,
          borderRadius: gnr8VisualTokens.radius.button,
          background: state === "running" ? gnr8VisualTokens.color.accentOrangeSoft : gnr8VisualTokens.color.accentOrange,
          color: state === "running" ? gnr8VisualTokens.color.accentOrangeHover : "#fff",
          cursor: state === "running" ? "wait" : "pointer",
          fontSize: 13,
          fontWeight: 700,
          padding: "7px 10px",
        }}
      >
        {state === "running" ? "Rechecking..." : "Recheck Domain"}
      </button>
      {state === "failed" ? <span style={{ color: "#b91c1c", fontSize: 12 }}>Recheck failed.</span> : null}
    </div>
  );
}
