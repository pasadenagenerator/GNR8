type FooterLink = {
  label: string;
  href: string;
};

type FooterBasicProps = {
  links?: FooterLink[];
  copyright?: string;
};

export function FooterBasic(props: FooterBasicProps) {
  const links = props.links ?? [];
  const { copyright } = props;

  return (
    <footer style={{ borderTop: "1px solid #e5e7eb", marginTop: "2rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {links.length > 0 ? (
          <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1rem", marginBottom: "1rem" }}>
            {links.map((link, index) => (
              <a
                key={`${link.href ?? ""}-${link.label ?? index}`}
                href={link.href}
                style={{ color: "#374151", textDecoration: "none", fontSize: "0.9375rem" }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        {copyright ? <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>{copyright}</div> : null}
      </div>
    </footer>
  );
}

