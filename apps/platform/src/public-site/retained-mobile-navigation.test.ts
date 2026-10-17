import assert from "node:assert/strict";
import test from "node:test";
import { restoreRetainedMobileNavigation } from "./retained-mobile-navigation";
import { prepareOwnedRetainedRuntimeForAstro } from "./owned-retained-runtime";
import { RETAINED_HERO_SCRIPT } from "./retained-hero-slider";

const html = '<html lang="sl"><body><div id="Top_bar" class="loading"><nav id="menu"><ul><li><a href="/">Domov</a></li><li><a href="/storitve">Storitve</a><ul><li><a href="/storitve#gradnja">Gradnja</a></li></ul></li></ul></nav><a class="responsive-menu-toggle" href="#">Menu</a><a class="action_button" href="/contact">Kontakt</a></div><form action="/contact"><input name="message"></form></body></html>';
test("retained mobile navigation preserves parent and nested links using native keyboard disclosures", () => {
  const result = restoreRetainedMobileNavigation(html);
  assert.equal((result.match(/<details/g) || []).length, 2);
  assert.ok(result.includes('<summary>Meni</summary>'));
  assert.ok(!result.includes('class="loading"'));
  assert.ok(result.includes('<summary>Podmeni: Storitve</summary>'));
  for (const href of ['/', '/storitve', '/storitve#gradnja', '/contact']) assert.equal(result.split(`href="${href}"`).length - 1, 2);
  assert.ok(result.includes('<form action="/contact"><input name="message"></form>'));
  assert.ok(!result.includes('<script'));
  assert.equal(restoreRetainedMobileNavigation(result), result);
  assert.equal(restoreRetainedMobileNavigation(html.replace('href="/storitve"', 'href="javascript:alert(1)"')), html.replace('href="/storitve"', 'href="javascript:alert(1)"'));
});

test("Astro script exception checks exact code and attributes, including scripts inside templates", () => {
  const script = `<script data-gnr8-preview-runtime="retained-hero">${RETAINED_HERO_SCRIPT}</script>`;
  const result = prepareOwnedRetainedRuntimeForAstro(script);
  assert.ok(result.includes(' is:inline>'));
  assert.equal(prepareOwnedRetainedRuntimeForAstro(result), result);
  for (const unsafe of [script.replace(RETAINED_HERO_SCRIPT, 'alert(1)'), script.replace('<script ', '<script src="owned.js" '), script.replace('<script ', '<script onload="alert(1)" '), '<template><script>alert(1)</script></template>']) {
    assert.throws(() => prepareOwnedRetainedRuntimeForAstro(unsafe), /unsupported_astro_page_script/);
  }
});
