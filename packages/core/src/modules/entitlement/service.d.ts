import type { BillingTx } from '../billing/repository';
import type { EntitlementRepository } from './repository';
import type { EntitlementKey, SyncSubscriptionInput } from './types';
export declare class EntitlementService {
    private readonly entitlementRepository;
    constructor(entitlementRepository: EntitlementRepository);
    assert(orgId: string, entitlementKey: EntitlementKey): Promise<void>;
    /**
     * IMPORTANT (Option B - recommended):
     * Entitlements vežemo na Stripe subscription id (sub_...),
     * ker je to stabilen lifecycle key v webhook eventih.
     */
    syncFromPlan(orgId: string, subscription: SyncSubscriptionInput, tx: BillingTx): Promise<void>;
    /**
     * Deaktivacija cilja Stripe subscription id (sub_...).
     */
    deactivateForSubscription(orgId: string, stripeSubscriptionId: string, tx: BillingTx): Promise<void>;
}
//# sourceMappingURL=service.d.ts.map