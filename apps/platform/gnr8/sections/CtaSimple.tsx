type CtaSimpleProps = {
  headline?: string;
  subheadline?: string;
  buttonLabel?: string;
  buttonHref?: string;
};

export function CtaSimple(props: CtaSimpleProps) {
  const { headline, subheadline, buttonLabel, buttonHref } = props;

  return (
    <section style={{ padding: "3rem 1.5rem", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {headline ? <h2 style={{ margin: 0, fontSize: "1.75rem", lineHeight: 1.2 }}>{headline}</h2> : null}
        {subheadline ? <p style={{ margin: "0.75rem 0 0 0", color: "#4b5563", maxWidth: 720 }}>{subheadline}</p> : null}
        {buttonLabel && buttonHref ? (
          <div style={{ marginTop: "1.25rem" }}>
            <a
              href={buttonHref}
              style={{
                display: "inline-block",
                padding: "0.65rem 1rem",
                borderRadius: 10,
                background: "#111827",
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              {buttonLabel}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

