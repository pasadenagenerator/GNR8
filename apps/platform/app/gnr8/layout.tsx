import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import GlobalNavigation from './_components/global/GlobalNavigation'
import { requireSuperadminUserIdForPage } from '@/src/auth/require-superadmin-user-id'
import {
  type CurrentUserAgencyMembership,
  ResolveCurrentAgencyError,
  listCurrentUserAgencyMembershipsForPage,
} from '@/src/auth/resolve-current-agency'
import {
  type CurrentUserClientMembership,
  ResolveCurrentClientError,
  listCurrentUserClientMembershipsForPage,
} from '@/src/auth/resolve-current-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  children: ReactNode
}

async function resolveCommandCenterVisibility(): Promise<boolean> {
  try {
    await requireSuperadminUserIdForPage()
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'Unauthorized') {
      redirect('/login')
    }
    if (message.startsWith('Forbidden')) {
      return false
    }
    throw error
  }
}

async function resolveAgencyMemberships(): Promise<CurrentUserAgencyMembership[]> {
  try {
    const membershipContext = await listCurrentUserAgencyMembershipsForPage()
    return membershipContext.memberships
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/login')
      }
      return []
    }
    throw error
  }
}

async function resolveClientMemberships(): Promise<CurrentUserClientMembership[]> {
  try {
    const membershipContext = await listCurrentUserClientMembershipsForPage()
    return membershipContext.memberships
  } catch (error) {
    if (error instanceof ResolveCurrentClientError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/login')
      }
      return []
    }
    throw error
  }
}

export default async function Gnr8RootLayout(props: Props) {
  const [showCommandCenter, agencyMemberships, clientMemberships] = await Promise.all([
    resolveCommandCenterVisibility(),
    resolveAgencyMemberships(),
    resolveClientMemberships(),
  ])
  const showAgency = agencyMemberships.length > 0
  const showClient = clientMemberships.length > 0

  return (
    <>
      <GlobalNavigation
        showCommandCenter={showCommandCenter}
        showAgency={showAgency}
        showClient={showClient}
        agencyBrands={agencyMemberships.map((membership) => ({
          id: membership.agency_id,
          label: membership.agency_name?.trim() || membership.agency_id,
          logoUrl: membership.agency_logo_url,
        }))}
        clientBrands={clientMemberships.map((membership) => ({
          id: membership.client_id,
          label: membership.client_name?.trim() || membership.client_id,
          logoUrl: membership.client_logo_url,
        }))}
      />
      {props.children}
    </>
  )
}
