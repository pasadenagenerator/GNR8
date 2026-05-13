import { getSuperadminPool } from './src/superadmin/db'

function extract(html: string) {
  const scrollIcon = html.match(/<a\b[^>]*data-req=(['"])scrollTop\1[^>]*>/i)?.[0] ?? null
  const css = [...html.matchAll(/<link\b[^>]*rel=(['"]).*?stylesheet.*?\1[^>]*>/gi)].map((m) => m[0].match(/href=(['"])(.*?)\1/i)?.[2] ?? null).filter((v): v is string => Boolean(v))
  const js = [...html.matchAll(/<script\b[^>]*src=(['"])(.*?)\1[^>]*>/gi)].map((m) => m[2])
  const bodyClass = html.match(/<body\b[^>]*class=(['"])(.*?)\1/i)?.[2] ?? null
  const htmlClass = html.match(/<html\b[^>]*class=(['"])(.*?)\1/i)?.[2] ?? null
  return { scrollIcon, css, js, bodyClass, htmlClass }
}

async function inspect(siteId: string, label: string) {
  const pool = getSuperadminPool()
  const art = await pool.query(`
    select id::text as artifact_id, site_version_id::text as site_version_id, entry_html_path::text, asset_base_path::text, file_map
    from public.gnr8_runtime_raw_template_artifacts
    where site_id=$1 and artifact_type='raw_imported_site'
    order by created_at desc
    limit 1
  `, [siteId])
  const row = art.rows[0]
  if (!row) return { label, siteId, error: 'no_raw_imported_artifact' }
  const bytes = await pool.query(`
    select content_bytes
    from public.gnr8_runtime_raw_template_artifact_files
    where artifact_id=$1::uuid and file_path=$2
    limit 1
  `, [row.artifact_id, row.entry_html_path])
  const html = bytes.rows[0]?.content_bytes ? Buffer.from(bytes.rows[0].content_bytes).toString('utf8') : ''
  const refs = extract(html)
  const cssChecks: Array<{href:string, normalized:string, fileMapHit:boolean, rowHit:boolean}> = []
  const fileMap = row.file_map as Record<string, unknown>
  for (const href of refs.css) {
    const normalized = href.replace(/^\/+/, '').split(/[?#]/,1)[0]
    const rowCheck = await pool.query(`select 1 from public.gnr8_runtime_raw_template_artifact_files where artifact_id=$1::uuid and file_path=$2 limit 1`, [row.artifact_id, normalized])
    cssChecks.push({ href, normalized, fileMapHit: Boolean(fileMap?.[normalized]), rowHit: rowCheck.rowCount > 0 })
  }
  return {
    label,
    siteId,
    siteVersionId: row.site_version_id,
    artifactId: row.artifact_id,
    entryHtmlPath: row.entry_html_path,
    assetBasePath: row.asset_base_path,
    refs,
    cssChecks,
  }
}

async function main() {
  const maverPrimary = await inspect('site_a978f53fa5aadbb51fdf', 'maver_primary')
  const maverAlt = await inspect('site_7c77126de646f746b3bd', 'maver_alt')
  const roboplast = await inspect('site_aa6b25cd33e9c1384d35', 'roboplast')
  console.log(JSON.stringify({ maverPrimary, maverAlt, roboplast }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
