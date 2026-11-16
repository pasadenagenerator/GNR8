import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
test('variant selection waits for the server tree, blocks stale Stacki, preserves context and reloads', async () => {
  const bundle = await build({ write: false, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    tsconfig: resolve('apps/platform/tsconfig.json'),
    stdin: { resolveDir: directory, loader: 'tsx', contents: `
import React, { Suspense, use, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { VariantNavigation } from './VariantNavigation';
import SiteActionsPanel from './SiteActionsPanel';
import StackiEditorPanel from './StackiEditorPanel';
const rows = ['a','b','c'].map(id => ({id,label:id,strategy:'retained',siteVersionId:'version-'+id,createdAt:'2026-11-01T18:28:01Z'}));
const ready = new Map();
function App() {
 const [query,setQuery] = useState(location.search);
 window.navigate = href => {
  window.calls.push(href);
  const next = new URL(href,location.origin).search;
  ready.set(next,new Promise(resolve => {window.finish = resolve}));
  setQuery(next);
 };
 if(ready.has(query)) use(ready.get(query));
 const selected = new URLSearchParams(query).get('variant') || '';
 window.committedQuery=query;
 return <VariantNavigation selectedVariantId={selected || null} agencyId='agency-1'>
  <SiteActionsPanel siteId='site-1' clientId='client-1' agencyId='agency-1' siteName='Local' activeTab='design'
   canRunTransformation={false} canPublish={false} lastRunAt='2026-11-01T18:28:01Z' currentStatus='completed'
   lastAction={{type:null,status:'completed',resultSummary:null,diagnostics:[],createdAt:null,completedAt:'2026-11-01T18:28:01Z'}}
   variants={{selectedVariantId:selected || null,rows}} />
  <p id='preview'>version-{selected || 'latest'}</p>
  <StackiEditorPanel key={selected} agencyId='agency-1' clientId='client-1' siteId='site-1' siteVersionId={'version-'+(selected || 'latest')} />
 </VariantNavigation>
}
window.calls=[];
const original=Date.prototype.toLocaleString;
Date.prototype.toLocaleString=function(){return 'SERVER LOCALE'};
document.getElementById('root').innerHTML=renderToString(<Suspense><App /></Suspense>);
Date.prototype.toLocaleString=function(){return 'BROWSER LOCALE'};
window.hydrationErrors=[];
hydrateRoot(document.getElementById('root'),<Suspense><App /></Suspense>,{onRecoverableError:error=>window.hydrationErrors.push(error.message)});
` },
    plugins: [{ name: 'local-router-boundary', setup(build) {
      build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'fixture' }))
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
export const useRouter=()=>({replace:href=>window.navigate(href),refresh:()=>{throw Error('unexpected refresh')}});
export const usePathname=()=>location.pathname;
export const useSearchParams=()=>new URLSearchParams(window.committedQuery || location.search);` }))
    } }],
  })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    const requests: string[] = []
    const openIds: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      assert.equal(url.hostname, 'gnr8-local.invalid')
      if (url.pathname.includes('/api/')) {
        requests.push(url.pathname + url.search)
        if (url.pathname.includes('/stacki-drafts/version-b/session') && route.request().method() === 'POST') {
          const body = route.request().postDataJSON()
          if (body.action === 'open') {
            openIds.push(body.id)
            if (openIds.length === 1)
              return route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'STACKI_SESSION_EXPIRED' }) })
          }
        }
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Local test: no runtime execution' }) })
      }
      return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><script>' + bundle.outputFiles[0].text.replaceAll('</script>', '<\\/script>') + '</script>' })
    })
    await page.goto('https://gnr8-local.invalid/design?agency=agency-1&admin_view=1&variant=a')
    assert.deepEqual(errors, [])
    const selector = page.locator('select').last()
    await selector.selectOption('b')
    assert.equal(await selector.inputValue(), 'b')
    assert.equal(await selector.isDisabled(), true)
    assert.equal(await page.getByRole('button', { name: 'Odpri v Stackiju', exact: true }).isDisabled(), true)
    assert.equal(await page.locator('#preview').textContent(), 'version-a')
    // A rapid second user choice cannot race a still-pending selection.
    await selector.press('ArrowDown')
    assert.deepEqual(await page.evaluate(() => (window as any).calls), ['/design?agency=agency-1&admin_view=1&variant=b'])
    await page.evaluate(() => (window as any).finish())
    await page.waitForFunction(() => document.querySelector('#preview')?.textContent === 'version-b')
    assert.equal(await selector.isEnabled(), true)
    await page.getByRole('button', { name: 'Odpri v Stackiju', exact: true }).click()
    await page.waitForFunction(() => document.body.textContent?.includes('Ponovno kliknite »Odpri v Stackiju«'))
    await page.getByRole('button', { name: 'Odpri v Stackiju', exact: true }).click()
    await page.waitForFunction(() => document.body.textContent?.includes('Dejanja ni bilo mogoče potrditi.'))
    assert.equal(openIds.length, 2)
    assert.notEqual(openIds[0], openIds[1], 'expired reservation must not be replayed')
    assert(requests.some(url => url.includes('/stacki-drafts/version-b/session?agencyId=agency-1')))
    assert(!requests.some(url => url.includes('/stacki-drafts/version-a/')))
    await selector.selectOption('c')
    await page.evaluate(() => (window as any).finish())
    await page.waitForFunction(() => document.querySelector('#preview')?.textContent === 'version-c')
    await page.goto('https://gnr8-local.invalid/design?agency=agency-1&admin_view=1&variant=c')
    await page.reload()
    assert.equal(await selector.inputValue(), 'c')
    assert.equal(await page.locator('#preview').textContent(), 'version-c')
    await selector.selectOption('')
    await page.evaluate(() => (window as any).finish())
    await page.waitForFunction(() => document.querySelector('#preview')?.textContent === 'version-latest')
    assert.deepEqual(await page.evaluate(() => (window as any).calls), ['/design?agency=agency-1&admin_view=1'])
    assert.deepEqual(await page.evaluate(() => (window as any).hydrationErrors), [])
    assert.deepEqual(errors, [])
    await page.screenshot({ path: resolve('docs/product/evidence/variant-selection-local/selection.png'), fullPage: true })
  } finally { await browser.close() }
})
