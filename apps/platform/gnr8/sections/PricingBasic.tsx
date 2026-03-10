type PricingPlan = {
  name: string;
  price?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type PricingBasicProps = {
  plans?: PricingPlan[];
};

export function PricingBasic(props: PricingBasicProps) {
  const plans = props.plans ?? [];

  return (
    <section style={{ padding: "3rem 1.5rem", borderTop: "1px solid #e5e7eb" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {plans.map((plan, index) => (
          <article
            key={`${plan.name ?? ""}-${index}`}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: "1.25rem",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem" }}>{plan.name}</h3>
              {plan.price ? <div style={{ marginTop: "0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>{plan.price}</div> : null}
            </div>
            {plan.description ? <p style={{ margin: 0, color: "#4b5563" }}>{plan.description}</p> : null}
            {plan.ctaLabel && plan.ctaHref ? (
              <div style={{ marginTop: "auto" }}>
                <a
                  href={plan.ctaHref}
                  style={{
                    display: "inline-block",
                    padding: "0.6rem 0.9rem",
                    borderRadius: 10,
                    border: "1px solid #111827",
                    color: "#111827",
                    textDecoration: "none",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                  }}
                >
                  {plan.ctaLabel}
                </a>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

