// packages/data/src/repositories/postgres-superadmin-trial-repository.ts

import type { SuperadminTrialOrgRow, SuperadminTrialRepository } from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'

type OrgRow = SuperadminTrialOrgRow

function normalizeOrgId(input: unknown): string {
  return String(input ?? '').trim()
}

function normalizeDays(input: unknown): number {
  const n = Number(input)
  // repo naj bo defensive: nikoli 0, nikoli NaN
  if (!Number.isFinite(n)) return 14
  return Math.max(1, Math.trunc(n))
}

export class PostgresSuperadminTrialRepository implements SuperadminTrialRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async setTrialWindow(input: {
    orgId: string
    trialEndsAt: string | null
    trialStartedAt: string | null
  }): Promise<OrgRow | null> {
    const orgId = normalizeOrgId(input.orgId)
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<OrgRow>(
        `
        update public.organizations
           set trial_started_at = coalesce($2::timestamptz, trial_started_at),
               trial_ends_at    = $3::timestamptz,
               updated_at       = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
        `,
        [orgId, input.trialStartedAt, input.trialEndsAt],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }

  async startTrial(input: { orgId: string; days: number }): Promise<OrgRow | null> {
    const orgId = normalizeOrgId(input.orgId)
    if (!orgId) return null

    const days = normalizeDays(input.days)

    const client = await this.pool.connect()
    try {
      const res = await client.query<OrgRow>(
        `
        update public.organizations
           set trial_started_at = now(),
               trial_ends_at    = now() + ($2::int * interval '1 day'),
               updated_at       = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
        `,
        [orgId, days],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }

  async extendTrial(input: { orgId: string; days: number }): Promise<OrgRow | null> {
    const orgId = normalizeOrgId(input.orgId)
    if (!orgId) return null

    const days = normalizeDays(input.days)

    const client = await this.pool.connect()
    try {
      const res = await client.query<OrgRow>(
        `
        update public.organizations
           set trial_started_at = coalesce(trial_started_at, now()),
               trial_ends_at    = case
                 when trial_ends_at is null then now() + ($2::int * interval '1 day')
                 when trial_ends_at < now() then now() + ($2::int * interval '1 day')
                 else trial_ends_at + ($2::int * interval '1 day')
               end,
               updated_at       = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
        `,
        [orgId, days],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }

  async endTrial(input: { orgId: string }): Promise<OrgRow | null> {
    const orgId = normalizeOrgId(input.orgId)
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      const res = await client.query<OrgRow>(
        `
        update public.organizations
           set trial_ends_at = now(),
               updated_at    = now()
         where id = $1::uuid
         returning
           id::text as id,
           name::text as name,
           slug::text as slug,
           created_at::text as created_at,
           updated_at::text as updated_at,
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
        `,
        [orgId],
      )

      return res.rows[0] ?? null
    } finally {
      client.release()
    }
  }
}