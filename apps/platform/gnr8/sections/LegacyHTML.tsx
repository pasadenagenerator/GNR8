type LegacyHTMLProps = {
  html?: string;
};

export function LegacyHTML(props: LegacyHTMLProps) {
  const html = props.html ?? "";

  return (
    <section style={{ padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

