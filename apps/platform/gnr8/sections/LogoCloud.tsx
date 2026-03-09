type LogoCloudProps = {
  logos?: string[];
};

export function LogoCloud(props: LogoCloudProps) {
  const logos = props.logos ?? [];

  return (
    <section style={{ padding: "2.5rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {logos.map((logo) => (
          <div
            key={logo}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              color: "#374151",
            }}
          >
            {logo}
          </div>
        ))}
      </div>
    </section>
  );
}

