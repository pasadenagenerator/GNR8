export type OrgStats = {
  org: {
    id: string
    name: string
    slug: string | null
    createdAt: string | null
    updatedAt: string | null
  }
  trial: {
    startedAt: string | null
    endsAt: string | null
    isActive: boolean
    isExpired: boolean
  }
  counts: {
    users: number
    projectsActive: number
    projectsDeleted: number
  }
  billing: null | {
    planKey: string | null
    status: string | null
    currentPeriodEnd: string | null
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
  }
}

export type GetOrgStatsInput = {
  actorUserId: string
  orgId: string
}