type HeroSplitProps = {
  headline?: string;
  subheadline?: string;
};

export function HeroSplit(props: HeroSplitProps) {
  const { headline = "Build fast with GNR8", subheadline = "A canonical page model rendered at runtime." } = props;

  return (
    <section style={{ padding: "4rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.25rem", lineHeight: 1.1, marginBottom: "0.75rem" }}>{headline}</h1>
        <p style={{ fontSize: "1.125rem", color: "#4b5563", maxWidth: 680 }}>{subheadline}</p>
      </div>
    </section>
  );
}

