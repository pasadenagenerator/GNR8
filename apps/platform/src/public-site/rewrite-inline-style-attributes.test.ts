import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "parse5";
import { rewriteInlineStyleAttributes } from "./rewrite-inline-style-attributes";

test("style rewriting decodes entities once, preserves attribute boundaries and leaves scripts/comments untouched", () => {
  const untouched = `<script>const sample = 'style="background:url(/old.png)"';</script><!-- style="background:url(/old.png)" -->`;
  const html = `<div style='background:url(&quot;/old.png?a=1&amp;b=2&quot;);font-family:&quot;A&amp;quot;B&quot;' title="unchanged"></div>${untouched}`;
  const output = rewriteInlineStyleAttributes(html, (css) => css.replace("/old.png", "/new.png"));
  assert.ok(output.endsWith(untouched));
  const body = parse(output).childNodes.find((node) => node.nodeName === "html") as any;
  const div = body.childNodes.find((node: any) => node.nodeName === "body").childNodes[0];
  assert.equal(div.attrs.find((attr: any) => attr.name === "style").value, 'background:url("/new.png?a=1&b=2");font-family:"A&quot;B"');
  assert.equal(div.attrs.find((attr: any) => attr.name === "title").value, "unchanged");
  assert.equal(rewriteInlineStyleAttributes(output, (css) => css.replace("/old.png", "/new.png")), output);
});
