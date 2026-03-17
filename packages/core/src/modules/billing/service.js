import { DomainError } from '../../service-contract';
const SUPPORTED_EVENTS = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
]);
/**
 * Optional fallback mapping Stripe price IDs (price_...) -> internal plan keys.
 * Prefer using Stripe Price.lookup_key (starter|pro|agency) instead.
 */
const PRICE_TO_PLAN_KEY = {
    // starter (1€/month)
    price_1T15SdJhsQUpBM8AEGQUQ1pV: 'starter',
};
function isPlanKey(value) {
    return value === 'starter' || value === 'pro' || value === 'agency';
}
function normalizeString(value) {
    return (value ?? '').trim().toLowerCase();
}
function resolvePlanKey(event) {
    const obj = event.data.object;
    // 1) Explicit override via subscription metadata (if you ever set it)
    const fromMetadata = normalizeString(obj.metadata?.plan_key);
    if (fromMetadata && isPlanKey(fromMetadata)) {
        return fromMetadata;
    }
    // 2) Preferred: Stripe Price.lookup_key (you set this to starter|pro|agency)
    const lookupKey = normalizeString(obj.items?.data?.[0]?.price?.lookup_key ?? null);
    if (lookupKey && isPlanKey(lookupKey)) {
        return lookupKey;
    }
    // 3) Fallback: map by Stripe price.id
    const priceId = obj.items?.data?.[0]?.price?.id ?? null;
    if (priceId && PRICE_TO_PLAN_KEY[priceId]) {
        return PRICE_TO_PLAN_KEY[priceId];
    }
    // 4) Safe fallback
    return 'starter';
}
function toIsoOrNull(epochSeconds) {
    if (!epochSeconds)
        return null;
    return new Date(epochSeconds * 1000).toISOString();
}
function toSubscription(event, orgId) {
    const obj = event.data.object;
    return {
        // NOTE: internal id is generated in DB on upsert, so it's intentionally NOT set here
        orgId,
        stripeCustomerId: String(obj.customer),
        stripeSubscriptionId: obj.id,
        planKey: resolvePlanKey(event),
        status: obj.status,
        currentPeriodEnd: toIsoOrNull(obj.current_period_end),
    };
}
function isCanceledStatus(status) {
    return (status === 'canceled' ||
        status === 'unpaid' ||
        status === 'incomplete_expired');
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
            const shouldProcess = await this.billingRepository.markStripeEventProcessed(tx, {
                stripeEventId: event.id,
                eventType: event.type,
            });
            if (!shouldProcess)
                return;
            const subscriptionObject = event.data.object;
            const explicitOrgId = subscriptionObject.metadata?.org_id?.trim();
            const existing = await this.billingRepository.findSubscriptionByStripeSubscriptionId(tx, subscriptionObject.id);
            const orgId = explicitOrgId || existing?.orgId;
            if (!orgId) {
                throw new DomainError('Cannot map Stripe subscription to organization (missing metadata.org_id)');
            }
            // cancel / delete => deactivate entitlements
            if (event.type === 'customer.subscription.deleted' ||
                isCanceledStatus(subscriptionObject.status)) {
                await this.entitlementService.deactivateForSubscription(orgId, subscriptionObject.id, // stripeSubscriptionId
                tx);
                return;
            }
            // upsert subscription
            const subscription = await this.billingRepository.upsertSubscription(tx, toSubscription(event, orgId));
            // sync entitlements from plan (keyed by stripeSubscriptionId)
            await this.entitlementService.syncFromPlan(orgId, {
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                planKey: subscription.planKey,
            }, tx);
        });
    }
}
