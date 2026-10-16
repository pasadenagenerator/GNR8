import assert from "node:assert/strict";
import test from "node:test";
import { restoreRetainedEqualHeightLayout } from "./retained-equal-height-layout";

test("retained equal-height fallback scopes alignment to supported rows and preserves content", () => {
  const row = '<div class="section equal-height-wrap"><div class="section_wrapper"><div class="mcb-wrap one-second valign-middle"><div class="mcb-wrap-inner"><h2>Text</h2></div></div><div class="mcb-wrap one-second valign-middle"><div class="mcb-wrap-inner"><img src="photo.jpg"></div></div></div></div>';
  const html = `<html><body><section>Prior section</section>${row}<section>Following section</section></body></html>`;
  const output = restoreRetainedEqualHeightLayout(html);
  assert.ok(output.includes(row.replace('class="section_wrapper"', 'class="section_wrapper" data-gnr8-equal-height')));
  assert.ok(output.includes('<section>Prior section</section>'));
  assert.ok(output.includes('<section>Following section</section>'));
  assert.ok(output.includes('transform:none'));
  assert.equal(restoreRetainedEqualHeightLayout(output), output);
  for (const unsupported of [html.replaceAll('valign-middle', 'valign-top'), html.replaceAll('class="mcb-wrap one-second', 'class="unknown one-second'), '<main>Ordinary page</main>']) {
    assert.equal(restoreRetainedEqualHeightLayout(unsupported), unsupported);
  }
});
