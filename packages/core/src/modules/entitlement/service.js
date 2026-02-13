import { DomainError } from '../../service-contract';
import { PLAN_ENTITLEMENTS } from './plan-map';
export class EntitlementService {
    entitlementRepository;
    constructor(entitlementRepository) {
        this.entitlementRepository = entitlementRepository;
    }
    async syncFromPlan(orgId, subscription, tx) {
        const planKey = subscription.planKey.trim().toLowerCase();
        if (!planKey) {
            throw new DomainError('subscription plan is required for entitlement sync');
        }
        const mapped = PLAN_ENTITLEMENTS[planKey];
        if (!mapped) {
            throw new DomainError(`Unsupported plan for entitlements: ${planKey}`);
        }
        await this.entitlementRepository.replaceActiveEntitlements(tx, {
            orgId,
            entitlementKeys: mapped,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
        });
    }
    async deactivateForSubscription(orgId, stripeSubscriptionId, tx) {
        await this.entitlementRepository.deactivateEntitlements(tx, {
            orgId,
            stripeSubscriptionId,
        });
    }
}
