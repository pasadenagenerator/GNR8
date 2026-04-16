import TemplateEditClient from './TemplateEditClient'

type Params = {
  clientId: string
  templateId: string
}

type SearchParams = {
  agency?: string
  admin_view?: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientTemplateEditPage(props: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const { clientId, templateId } = await props.params
  const resolvedSearch = props.searchParams ? await props.searchParams : undefined

  const agencyId = normalizeText(resolvedSearch?.agency)
  const adminView = normalizeText(resolvedSearch?.admin_view)
  const query = new URLSearchParams()
  if (agencyId) query.set('agency', agencyId)
  if (adminView === '1') query.set('admin_view', '1')

  const backHrefBase = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/dashboard`
  const backHref = query.toString() ? `${backHrefBase}?${query.toString()}` : backHrefBase

  return (
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <header style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Template Management</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Client-scoped template metadata management. No website creation flow is executed from this page.
        </p>
      </header>

      <TemplateEditClient clientId={clientId} templateId={templateId} backHref={backHref} />
    </main>
  )
}
