type FaqItem = {
  question: string;
  answer: string;
};

type FaqBasicProps = {
  items?: FaqItem[];
};

export function FaqBasic(props: FaqBasicProps) {
  const items = props.items ?? [];

  return (
    <section style={{ padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          {items.map((item, index) => (
            <div key={`${item.question ?? ""}-${index}`} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem" }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.5rem" }}>{item.question}</div>
              <div style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>{item.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

