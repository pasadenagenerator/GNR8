import assert from "node:assert/strict";
import test from "node:test";
import { enhanceRetainedHeroSliders, RETAINED_HERO_SCRIPT } from "./retained-hero-slider";

const prefix = "/api/gnr8/runtime/preview-assets/site_1/version_1/";
const slides = [1,2,3,4].map(i=>`<rs-slide><img src="${prefix}images/${i}.jpg" alt="Image ${i}"><rs-layer data-type="text" data-xy="x:40px;y:250px;" data-text="s:70;l:80;fw:500;" data-dim="w:804px;">Title ${i} &amp; text</rs-layer></rs-slide>`).join("");
const source = `<!doctype html><html lang="sl"><body><header>Keep me</header><rs-module-wrap id="hero_wrapper"><rs-module id="hero">${slides}</rs-module></rs-module-wrap><script>jQuery('#hero').revolution({duration:"5000ms",gridwidth:1920,gridheight:900});</script><script src="/assets/script/abc-rs6.min.js"></script><main>Unchanged page</main></body></html>`;
const input = { html:source, siteId:"site_1",siteVersionId:"version_1",fileMapPaths:new Set([1,2,3,4].map(i=>`images/${i}.jpg`)) };

test("retained hero preserves every slide and text, replaces only supported interaction, and is idempotent",()=>{
  const result=enhanceRetainedHeroSliders(input);
  assert.equal((result.match(/data-hero-slide=/g)||[]).length,4);
  assert.equal((result.match(/data-hero-dot=/g)||[]).length,4);
  assert.ok(result.includes('data-interval="5000"'));
  for(let i=1;i<=4;i++) assert.ok(result.includes(`Title ${i} &amp; text`));
  assert.ok(result.includes('<header>Keep me</header>'));
  assert.ok(result.includes('<main>Unchanged page</main>'));
  assert.equal((result.match(/data-gnr8-script-policy-reason="retained-hero-replaced"/g)||[]).length,2);
  assert.ok(result.includes(RETAINED_HERO_SCRIPT));
  assert.equal(enhanceRetainedHeroSliders({...input,html:result}),result);
  const captured=source.replaceAll('<img ', '<rs-sbg ').replace(/(<rs-sbg[^>]+>)/g,'$1</rs-sbg>');
  assert.equal((enhanceRetainedHeroSliders({...input,html:captured}).match(/data-hero-slide=/g)||[]).length,4);
});

test("incomplete, foreign and unsupported captures are left intact",()=>{
  for(const html of [source.replace('duration:"5000ms"','duration:calculateDelay()'),source.replace(`${prefix}images/4.jpg`,'https://outside.example/4.jpg'),source.replace('data-type="text"','data-type="video"'),source.replace('Title 1 &amp; text','<a href="/more">Keep this action</a>')]) {
    assert.equal(enhanceRetainedHeroSliders({...input,html}),html);
  }
  assert.equal(enhanceRetainedHeroSliders({...input,fileMapPaths:new Set(['images/1.jpg'])}),source);
  assert.equal(enhanceRetainedHeroSliders({...input,html:'<main>Unchanged child page</main>'}),'<main>Unchanged child page</main>');
});
