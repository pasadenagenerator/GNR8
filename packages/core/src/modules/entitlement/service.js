import { DomainError } from '../../service-contract';
import { PLAN_ENTITLEMENTS } from './plan-map';
export class EntitlementService {
    entitlementRepository;
    constructor(entitlementRepository) {
        this.entitlementRepository = entitlementRepository;
    }
    // HARD GATE za paid features (ProjectService, future guards)
    // READ-ONLY → brez BillingTx
    async assert(orgId, entitlementKey) {
        const has = await this.entitlementRepository.hasActiveEntitlement({
            orgId,
            entitlementKey,
        });
        if (!has) {
            throw new DomainError(`Missing required entitlement: ${entitlementKey}`);
        }
    }
    /**
     * IMPORTANT (Option B - recommended):
     * Entitlements vežemo na Stripe subscription id (sub_...),
     * ker je to stabilen lifecycle key v webhook eventih.
     */
    async syncFromPlan(orgId, subscription, tx) {
        const planKey = subscription.planKey.trim().toLowerCase();
        if (!planKey) {
            throw new DomainError('subscription plan is required for entitlement sync');
        }
        const mapped = PLAN_ENTITLEMENTS[planKey];
        if (!mapped) {
            throw new DomainError(`Unsupported plan for entitlements: ${planKey}`);
        }
        const stripeSubscriptionId = subscription.stripeSubscriptionId?.trim();
        if (!stripeSubscriptionId) {
            throw new DomainError('subscription.stripeSubscriptionId is required for entitlement sync');
        }
        await this.entitlementRepository.replaceActiveEntitlements(tx, {
            orgId,
            entitlementKeys: mapped,
            stripeSubscriptionId,
        });
    }
    /**
     * Deaktivacija cilja Stripe subscription id (sub_...).
     */
    async deactivateForSubscription(orgId, stripeSubscriptionId, tx) {
        const id = stripeSubscriptionId?.trim();
        if (!id) {
            throw new DomainError('stripeSubscriptionId is required for entitlement deactivation');
        }
        await this.entitlementRepository.deactivateEntitlements(tx, {
            orgId,
            stripeSubscriptionId: id,
        });
    }
}
