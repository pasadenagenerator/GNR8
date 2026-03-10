type NavbarLink = {
  label: string;
  href: string;
};

type NavbarBasicProps = {
  brandLabel?: string;
  links?: NavbarLink[];
};

export function NavbarBasic(props: NavbarBasicProps) {
  const { brandLabel } = props;
  const links = props.links ?? [];

  return (
    <header style={{ borderBottom: "1px solid #e5e7eb" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "1rem 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem 1rem",
          alignItems: "center",
          justifyContent: brandLabel ? "space-between" : "flex-end",
        }}
      >
        {brandLabel ? <div style={{ fontWeight: 600, color: "#111827" }}>{brandLabel}</div> : null}
        <nav aria-label="Primary" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1rem" }}>
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
      </div>
    </header>
  );
}
