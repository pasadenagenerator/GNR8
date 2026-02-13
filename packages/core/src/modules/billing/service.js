import { DomainError } from '../../service-contract';
const SUPPORTED_EVENTS = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
]);
function resolvePlanKey(event) {
    const fromMetadata = event.data.object.metadata?.plan_key;
    if (fromMetadata) {
        return fromMetadata;
    }
    return (event.data.object.items?.data?.[0]?.price?.lookup_key ??
        event.data.object.items?.data?.[0]?.price?.id ??
        'starter');
}
function toIsoOrNull(epochSeconds) {
    if (!epochSeconds) {
        return null;
    }
    return new Date(epochSeconds * 1000).toISOString();
}
function toSubscription(event, orgId) {
    return {
        orgId,
        stripeCustomerId: String(event.data.object.customer),
        stripeSubscriptionId: event.data.object.id,
        planKey: resolvePlanKey(event),
        status: event.data.object.status,
        currentPeriodEnd: toIsoOrNull(event.data.object.current_period_end),
    };
}
function isCanceledStatus(status) {
    return status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired';
}
export class BillingService {
    billingRepository;
    entitlementService;
    constructor(billingRepository, entitlementService) {
        this.billingRepository = billingRepository;
        this.entitlementService = entitlementService;
    }
    async handleStripeWebhook(event) {
        if (!event?.id || !event?.type || !event?.data?.object?.id) {
            throw new DomainError('Invalid Stripe event payload');
        }
        if (!SUPPORTED_EVENTS.has(event.type)) {
            return;
        }
        await this.billingRepository.withTransaction(async (tx) => {
            const shouldProcess = await this.billingRepository.markStripeEventProcessed(tx, { stripeEventId: event.id, eventType: event.type });
            if (!shouldProcess) {
                return;
            }
            const subscriptionObject = event.data.object;
            const explicitOrgId = subscriptionObject.metadata?.org_id?.trim();
            const existing = await this.billingRepository.findSubscriptionByStripeSubscriptionId(tx, subscriptionObject.id);
            const orgId = explicitOrgId || existing?.orgId;
            if (!orgId) {
                throw new DomainError('Cannot map Stripe subscription to organization (missing metadata.org_id)');
            }
            if (event.type === 'customer.subscription.deleted' ||
                isCanceledStatus(subscriptionObject.status)) {
                await this.billingRepository.markSubscriptionCanceled(tx, subscriptionObject.id);
                await this.entitlementService.deactivateForSubscription(orgId, subscriptionObject.id, tx);
                return;
            }
            const subscription = await this.billingRepository.upsertSubscription(tx, toSubscription(event, orgId));
            await this.entitlementService.syncFromPlan(orgId, subscription, tx);
        });
    }
}
