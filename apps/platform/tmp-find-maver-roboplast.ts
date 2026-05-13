import { getSuperadminPool } from './src/superadmin/db'

async function main() {
  const pool = getSuperadminPool()
  const domainRows = await pool.query(`
    select site_id::text, site_version_id::text, domain::text, status::text
    from public.gnr8_runtime_domain_host_bindings
    where lower(domain) like '%maver%' or lower(domain) like '%roboplast%'
    order by lower(domain)
  `)
  const hostRows = await pool.query(`
    select site_id::text, host::text, status::text, binding_kind::text
    from public.gnr8_runtime_host_bindings
    where lower(host) like '%maver%' or lower(host) like '%roboplast%'
    order by lower(host)
  `)
  console.log(JSON.stringify({ domainRows: domainRows.rows, hostRows: hostRows.rows }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
