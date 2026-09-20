import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAirshipDemoArtifactMarkerRefreshPlan,
  inspectAirshipDemoArtifactMarkerPlacement,
  refreshAirshipDemoArtifactSectionMarkersHtml,
} from "./airship-demo-artifact-section-marker-repair";
import {
  AIRSHIP_ARIS_CANDIDATE_ARTIFACT_ID,
  AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID,
  AIRSHIP_ARIS_RUNTIME_SITE_ID,
} from "./airship-aris-mvp-draft";
import {
  AIRSHIP_CHS_DEMO_ARTIFACT_ID,
  AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
  AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
} from "./airship-chs-demo-artifact-repair";

const staleArisHtml = `<!doctype html>
<html lang="sl">
<body>
  <nav><a href="#apple">Apple</a><a href="#kontakt">Kontakt</a></nav>
  <main id="top">
    <section class="hero">
      <div class="shell hero-grid">
        <h1>ARIS ponudba za Apple in Canton izdelke.</h1>
        <p>Izbor je pripravljen za hitrejši pregled ponudbe.</p>
        <div class="hero-actions"><a class="pill" href="#kontakt">Želim ponudbo</a></div>
      </div>
    </section>
    <section id="apple">
      <div class="shell">
        <div class="section-head">
          <h2>Apple ponudba</h2>
          <p>Minimalen demo izpostavlja izdelke.</p>
        </div>
        <div class="cards">
          <article class="card"><h3>MacBook Air 15</h3><p>Lahek prenosnik.</p></article>
          <article class="card"><h3>Mac Studio</h3><p>Namizna zmogljivost.</p></article>
          <article class="card"><h3>MacBook Pro</h3><p>Profesionalna izbira.</p></article>
        </div>
      </div>
    </section>
    <section id="canton" class="band">
      <div class="shell">
        <div class="section-head">
          <h2>Canton Smart ponudba</h2>
          <p>Audio izbor je urejen kot pregledna produktna linija.</p>
        </div>
        <div class="cards">
          <article class="card"><h3>Canton Smart</h3><p>Omrezena audio linija.</p></article>
          <article class="card"><h3>Smart Reference 5 K</h3><p>Referencni zvok.</p></article>
        </div>
      </div>
    </section>
    <section id="kontakt">
      <div class="shell contact-grid">
        <aside class="contact-panel" aria-label="Kontakt ARIS">
          <a href="mailto:prodaja@aris.si">prodaja@aris.si</a>
          <a class="pill" href="mailto:prodaja@aris.si?subject=Zelim%20ponudbo%20ARIS">Želim ponudbo</a>
        </aside>
      </div>
    </section>
  </main>
  <footer><div class="shell">GNR8 internal demo for ARIS visual review.</div></footer>
</body>
</html>`;

const staleChsHtml = `<!doctype html>
<html lang="en">
<body>
  <nav><a href="#identity">Services</a><a href="#contact">Contact</a></nav>
  <main id="top">
    <section class="hero" data-section="hero">
      <div class="shell hero-grid">
        <h1>The CHS team helps your IT change with every technology wave.</h1>
        <p>Advanced cybersecurity, data systems, and hybrid infrastructure support.</p>
        <div class="hero-actions"><a class="button" href="#contact">Contact Us</a></div>
      </div>
    </section>
    <section id="identity" data-section="identity">
      <div class="shell identity-grid">
        <h2>Technology change works when people can actually adopt it.</h2>
        <ul class="value-list">
          <li><strong>Experienced guidance</strong><p>Senior implementation support.</p></li>
          <li><strong>Practical execution</strong><p>Hands-on delivery.</p></li>
          <li><strong>Human adoption</strong><p>Support for real teams.</p></li>
        </ul>
      </div>
    </section>
    <section id="proof" class="proof" data-section="proof">
      <div class="shell">
        <article class="proof-card"><h3>Assess</h3><p>Understand the environment.</p></article>
        <article class="proof-card"><h3>Improve</h3><p>Prioritize resilient systems.</p></article>
      </div>
    </section>
    <section data-section="team">
      <div class="shell team-strip"><h2>Trusted specialists.</h2></div>
    </section>
    <section id="contact" class="contact" data-section="contact">
      <div class="shell contact-grid">
        <div class="contact-card"><dl><dt>Website</dt><dd>www.chs.si</dd></dl></div>
        <button class="button" type="button">Send inquiry</button>
      </div>
    </section>
  </main>
  <footer><div class="shell">CHS Airship MVP demo.</div></footer>
</body>
</html>`;

test("refreshAirshipDemoArtifactSectionMarkersHtml places ARIS markers on outer visual wrappers", () => {
  const repaired = refreshAirshipDemoArtifactSectionMarkersHtml({ target: "aris", html: staleArisHtml });
  const placement = inspectAirshipDemoArtifactMarkerPlacement(repaired.html);

  assert.deepEqual(placement.sectionMarkers, {
    hero: 1,
    offers: 1,
    proof: 1,
    cta: 1,
    footer: 1,
  });
  assert.equal(placement.sectionTags.offers?.tagName, "section");
  assert.equal(placement.sectionTags.offers?.id, "apple");
  assert.equal(placement.sectionTags.proof?.tagName, "section");
  assert.equal(placement.sectionTags.proof?.id, "canton");
  assert.equal(placement.sectionTags.cta?.tagName, "section");
  assert.equal(placement.sectionTags.cta?.id, "kontakt");
  assert.equal(placement.elementMarkers["offer-card"], 3);
  assert.equal(placement.elementMarkers["proof-card"], 2);
  assert.equal(placement.elementMarkers["hero-subheading"], 1);
  assert.equal(placement.elementMarkers["card-title"], 5);
  assert.equal(placement.elementMarkers["card-body"], 5);
  assert.equal(placement.elementMarkers["contact-card"], 1);
  assert.equal(placement.elementMarkers["contact-cta"], 1);
  assert.equal(placement.elementMarkers["nav-item"], 2);
  assert.equal(repaired.html.includes("Apple ponudba"), true);
  assert.equal(repaired.html.includes("MacBook Pro"), true);
  assert.equal(repaired.html.includes("Canton Smart ponudba"), true);
});

test("refreshAirshipDemoArtifactSectionMarkersHtml places CHS markers on outer visual wrappers", () => {
  const repaired = refreshAirshipDemoArtifactSectionMarkersHtml({ target: "chs", html: staleChsHtml });
  const placement = inspectAirshipDemoArtifactMarkerPlacement(repaired.html);

  assert.deepEqual(placement.sectionMarkers, {
    hero: 1,
    offers: 1,
    proof: 1,
    approach: 1,
    cta: 1,
    footer: 1,
  });
  assert.equal(placement.sectionTags.offers?.tagName, "section");
  assert.equal(placement.sectionTags.offers?.id, "identity");
  assert.equal(placement.sectionTags.proof?.tagName, "section");
  assert.equal(placement.sectionTags.proof?.id, "proof");
  assert.equal(placement.sectionTags.approach?.tagName, "section");
  assert.equal(placement.sectionTags.cta?.tagName, "section");
  assert.equal(placement.sectionTags.cta?.id, "contact");
  assert.equal(placement.elementMarkers["offer-card"], 3);
  assert.equal(placement.elementMarkers["proof-card"], 2);
  assert.equal(placement.elementMarkers["approach-card"], 1);
  assert.equal(placement.elementMarkers["hero-subheading"], 1);
  assert.equal(placement.elementMarkers["card-title"], 2);
  assert.equal(placement.elementMarkers["card-body"], 5);
  assert.equal(placement.elementMarkers["contact-card"], 1);
  assert.equal(placement.elementMarkers["contact-cta"], 1);
  assert.equal(placement.elementMarkers["nav-item"], 2);
});

test("buildAirshipDemoArtifactMarkerRefreshPlan is guarded to known ARIS and CHS demo artifacts", () => {
  const plan = buildAirshipDemoArtifactMarkerRefreshPlan({
    actor: "test",
    idempotencyKey: "test-idempotency",
    artifacts: {
      aris: {
        id: AIRSHIP_ARIS_CANDIDATE_ARTIFACT_ID,
        siteId: AIRSHIP_ARIS_RUNTIME_SITE_ID,
        siteVersionId: AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID,
        bundleSha256: "old-aris",
        htmlByPath: { "/": staleArisHtml },
        manifest: { existing: "aris" },
        publishStage: "shadow",
        shadowRestricted: false,
      },
      chs: {
        id: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
        siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
        siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
        bundleSha256: "old-chs",
        htmlByPath: { "/": staleChsHtml },
        manifest: { existing: "chs" },
        publishStage: "shadow",
        shadowRestricted: false,
      },
    },
  });

  assert.equal(plan.targets.length, 2);
  assert.equal(plan.manifestsByTarget.aris.existing, "aris");
  assert.equal(plan.manifestsByTarget.chs.existing, "chs");
  assert.notEqual(plan.targets.find((item) => item.target === "aris")?.repairedBundleSha256, "old-aris");
  assert.notEqual(plan.targets.find((item) => item.target === "chs")?.repairedBundleSha256, "old-chs");
  assert.equal(plan.htmlByTarget.aris["/"]?.includes('data-airship-section="offers"'), true);
  assert.equal(plan.htmlByTarget.chs["/"]?.includes('data-airship-section="approach"'), true);
});
