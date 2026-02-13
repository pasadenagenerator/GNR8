import type { BillingTx } from '@gnr8/core'
import type { PoolClient } from 'pg'

export class PostgresBillingTx implements BillingTx {
  readonly _tag = 'billing_tx' as const

  constructor(readonly client: PoolClient) {}
}
