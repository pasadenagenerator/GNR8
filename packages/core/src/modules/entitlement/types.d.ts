/**
 * Vse možne entitlements v sistemu
 */
export type EntitlementKey = 'organization.read' | 'organization.manage' | 'membership.manage' | 'project.create' | 'project.unlimited' | 'billing.manage' | 'agency.mode';
/**
 * Interni plan ključi (ne Stripe ID-ji!)
 * lookup_key na Stripe Price mora biti eden izmed teh
 */
export type PlanKey = 'starter' | 'pro' | 'agency';
/**
 * Input iz BillingService → EntitlementService
 * uporablja se takoj po upsertu subscriptiona
 */
export type SyncSubscriptionInput = {
    /**
     * Stripe subscription id (sub_...)
     * → glavni vezni ključ za entitlements
     */
    stripeSubscriptionId: string;
    /**
     * Internal plan key (starter | pro | agency)
     */
    planKey: PlanKey;
};
export type ReplaceActiveEntitlementsInput = {
    orgId: string;
    entitlementKeys: EntitlementKey[];
    /**
     * Stripe subscription id (sub_...)
     */
    stripeSubscriptionId: string;
};
export type DeactivateEntitlementsInput = {
    orgId: string;
    /**
     * Stripe subscription id (sub_...)
     */
    stripeSubscriptionId: string;
};
export type HasActiveEntitlementInput = {
    orgId: string;
    entitlementKey: EntitlementKey;
};
//# sourceMappingURL=types.d.ts.map