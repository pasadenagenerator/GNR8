type FeatureItem = {
  title: string;
  text: string;
};

type FeatureGridProps = {
  items?: FeatureItem[];
};

export function FeatureGrid(props: FeatureGridProps) {
  const items = props.items ?? [];

  return (
    <section style={{ padding: "2.5rem 1.5rem" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {items.map((item) => (
          <article
            key={item.title}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "1rem",
              background: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>{item.title}</h3>
            <p style={{ margin: 0, color: "#4b5563", fontSize: "0.9375rem" }}>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

