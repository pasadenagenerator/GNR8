export type SuperadminTrialOrgRow = {
  id: string
  name: string
  slug: string | null
  created_at: string | null
  updated_at: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}

export interface SuperadminTrialRepository {
  setTrialWindow(input: {
    orgId: string
    trialEndsAt: string | null
    trialStartedAt: string | null
  }): Promise<SuperadminTrialOrgRow | null>

  startTrial(input: { orgId: string; days: number }): Promise<SuperadminTrialOrgRow | null>
  extendTrial(input: { orgId: string; days: number }): Promise<SuperadminTrialOrgRow | null>
  endTrial(input: { orgId: string }): Promise<SuperadminTrialOrgRow | null>
}