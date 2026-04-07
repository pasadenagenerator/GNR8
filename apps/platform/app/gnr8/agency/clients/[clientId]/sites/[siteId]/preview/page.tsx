import SiteWorkspacePage from '../SiteWorkspacePage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientSitePreviewPage(props: {
  params: Promise<{ clientId?: string; siteId?: string }>
  searchParams?: Promise<{ agency?: string; admin_view?: string }>
}) {
  return <SiteWorkspacePage activeTab='preview' params={props.params} searchParams={props.searchParams} />
}
