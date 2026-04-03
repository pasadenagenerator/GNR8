import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import GlobalNavigation from './_components/global/GlobalNavigation'
import { requireSuperadminUserIdForPage } from '@/src/auth/require-superadmin-user-id'
import { ResolveCurrentAgencyError, listCurrentUserAgencyMembershipsForPage } from '@/src/auth/resolve-current-agency'
import { ResolveCurrentClientError, listCurrentUserClientMembershipsForPage } from '@/src/auth/resolve-current-client'

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

async function resolveAgencyVisibility(): Promise<boolean> {
  try {
    const membershipContext = await listCurrentUserAgencyMembershipsForPage()
    return membershipContext.memberships.length > 0
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/login')
      }
      return false
    }
    throw error
  }
}

async function resolveClientVisibility(): Promise<boolean> {
  try {
    const membershipContext = await listCurrentUserClientMembershipsForPage()
    return membershipContext.memberships.length > 0
  } catch (error) {
    if (error instanceof ResolveCurrentClientError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/login')
      }
      return false
    }
    throw error
  }
}

export default async function Gnr8RootLayout(props: Props) {
  const [showCommandCenter, showAgency, showClient] = await Promise.all([
    resolveCommandCenterVisibility(),
    resolveAgencyVisibility(),
    resolveClientVisibility(),
  ])

  return (
    <>
      <GlobalNavigation showCommandCenter={showCommandCenter} showAgency={showAgency} showClient={showClient} />
      {props.children}
    </>
  )
}
