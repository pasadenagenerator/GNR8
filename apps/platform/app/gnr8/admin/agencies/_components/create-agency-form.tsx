"use client";

import { useMemo, useState } from "react";

type CreateAgencyResponse = {
  ok: boolean;
  agency?: {
    id: string;
    name: string;
    slug: string;
  };
  owner?: {
    email: string;
    invite_status: "invited";
  };
  error?: string;
};

type CreateAgencyFormProps = {
  endpoint: string;
};

export function CreateAgencyForm({ endpoint }: CreateAgencyFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateAgencyResponse | null>(null);

  const slugHint = useMemo(() => {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || "agency-slug";
  }, [name]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          ownerEmail,
          ownerName: ownerName.trim() || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as CreateAgencyResponse | null;
      if (!response.ok || !payload?.ok) {
        setResult({
          ok: false,
          error: payload?.error ?? "Failed to create agency",
        });
        return;
      }

      setResult(payload);
      setName("");
      setSlug("");
      setOwnerEmail("");
      setOwnerName("");
    } catch {
      setResult({
        ok: false,
        error: "Failed to create agency",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 12,
        background: "#fff",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 20 }}>Create Agency</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#374151" }}>Agency Name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Acme Growth"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#374151" }}>Slug</span>
          <input
            required
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
            placeholder={slugHint}
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#374151" }}>Owner Email</span>
          <input
            required
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.currentTarget.value)}
            placeholder="owner@agency.com"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#374151" }}>Owner Name (optional)</span>
          <input
            value={ownerName}
            onChange={(event) => setOwnerName(event.currentTarget.value)}
            placeholder="Jane Doe"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            marginTop: 4,
            width: "fit-content",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #111827",
            background: isSubmitting ? "#6b7280" : "#111827",
            color: "#fff",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Creating..." : "Create Agency"}
        </button>
      </form>

      {result?.ok ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
          }}
        >
          <div>Agency created successfully.</div>
          <div>Agency: {result.agency?.name ?? "-"}</div>
          <div>Owner: {result.owner?.email ?? "-"}</div>
          <div>Status: {result.owner?.invite_status ?? "invited"}</div>
        </div>
      ) : null}

      {!result?.ok && result?.error ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
          }}
        >
          {result.error}
        </div>
      ) : null}
    </section>
  );
}
