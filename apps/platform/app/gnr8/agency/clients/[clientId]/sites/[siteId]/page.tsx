import { redirect } from 'next/navigation'

type SearchParams = {
  agency?: string
  admin_view?: string
}

type Params = {
  clientId?: string
  siteId?: string
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientSiteWorkspaceEntryPage(props: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const resolvedParams = await props.params
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined

  const clientId = String(resolvedParams.clientId ?? '').trim()
  const siteId = String(resolvedParams.siteId ?? '').trim()
  const agencyId = String(resolvedSearchParams?.agency ?? '').trim()
  const adminView = String(resolvedSearchParams?.admin_view ?? '').trim() === '1'

  if (!clientId || !siteId) {
    redirect('/gnr8/agency')
  }

  const query = new URLSearchParams()
  if (agencyId) query.set('agency', agencyId)
  if (adminView) query.set('admin_view', '1')
  const queryString = query.toString()

  redirect(
    queryString
      ? `/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/overview?${queryString}`
      : `/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/overview`,
  )
}
