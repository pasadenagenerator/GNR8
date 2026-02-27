export type SuperadminTrialAction = 'start' | 'extend' | 'end'

export type SuperadminTrialBody =
  | { action?: SuperadminTrialAction; days?: number }
  | { trialEndsAt?: string | null; trialStartedAt?: string | null }

export type SuperadminTrialOrg = {
  id: string
  name: string
  slug: string | null
  createdAt: string | null
  updatedAt: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
}

export type UpdateOrgTrialInput = {
  orgId: string
  body: SuperadminTrialBody
}

export type UpdateOrgTrialOutput = {
  org: SuperadminTrialOrg
}