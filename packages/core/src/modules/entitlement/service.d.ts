import type { BillingTx } from '../billing/repository';
import type { EntitlementRepository } from './repository';
import type { EntitlementKey, SyncSubscriptionInput } from './types';
export declare class EntitlementService {
    private readonly entitlementRepository;
    constructor(entitlementRepository: EntitlementRepository);
    /**
     * Trial fallback entitlements (če ni aktivne subscription / paid entitlements).
     * Namen: omogoči osnovno uporabo platforme med trialom.
     *
     * Opomba: limite (npr. max 1 projekt) enforce-a ProjectService.
     */
    private readonly TRIAL_ENTITLEMENTS;
    /**
     * HARD GATE (READ-only)
     * Paid entitlements imajo prednost; trial je fallback.
     */
    assert(orgId: string, entitlementKey: EntitlementKey): Promise<void>;
    /**
     * READ-only helper (boolean), za “soft checks” (npr. limits).
     */
    has(orgId: string, entitlementKey: EntitlementKey): Promise<boolean>;
    /**
     * Sync iz plana -> entitlements (tx)
     */
    syncFromPlan(orgId: string, subscription: SyncSubscriptionInput, tx: BillingTx): Promise<void>;
    deactivateForSubscription(orgId: string, stripeSubscriptionId: string, tx: BillingTx): Promise<void>;
    /**
     * Trial helper:
     * - Trial je aktiven samo, če imamo trial_started_at in trial_ends_at
     * - in je "now" znotraj [start, end]
     */
    private isTrialActive;
}
//# sourceMappingURL=service.d.ts.map