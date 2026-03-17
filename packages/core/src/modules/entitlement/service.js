import { DomainError, MissingEntitlementError } from '../../service-contract';
import { PLAN_ENTITLEMENTS } from './plan-map';
export class EntitlementService {
    entitlementRepository;
    constructor(entitlementRepository) {
        this.entitlementRepository = entitlementRepository;
    }
    /**
     * Trial fallback entitlements (če ni aktivne subscription / paid entitlements).
     * Namen: omogoči osnovno uporabo platforme med trialom.
     *
     * Opomba: limite (npr. max 1 projekt) enforce-a ProjectService.
     */
    TRIAL_ENTITLEMENTS = new Set([
        'organization.read',
        'project.create',
        // keep minimal; po potrebi dodamo kasneje
    ]);
    /**
     * HARD GATE (READ-only)
     * Paid entitlements imajo prednost; trial je fallback.
     */
    async assert(orgId, entitlementKey) {
        const cleanOrgId = String(orgId ?? '').trim();
        if (!cleanOrgId)
            throw new DomainError('orgId is required');
        // 1) Paid entitlements (canonical)
        const hasPaid = await this.entitlementRepository.hasActiveEntitlement({
            orgId: cleanOrgId,
            entitlementKey,
        });
        if (hasPaid)
            return;
        // 2) Trial fallback (če ni paid)
        const isTrial = await this.isTrialActive(cleanOrgId);
        if (isTrial && this.TRIAL_ENTITLEMENTS.has(entitlementKey))
            return;
        // 3) Enforcement fail (explicit error => routes can map to 403 without string matching)
        throw new MissingEntitlementError(entitlementKey);
    }
    /**
     * READ-only helper (boolean), za “soft checks” (npr. limits).
     */
    async has(orgId, entitlementKey) {
        const cleanOrgId = String(orgId ?? '').trim();
        if (!cleanOrgId)
            return false;
        const hasPaid = await this.entitlementRepository.hasActiveEntitlement({
            orgId: cleanOrgId,
            entitlementKey,
        });
        if (hasPaid)
            return true;
        const isTrial = await this.isTrialActive(cleanOrgId);
        if (!isTrial)
            return false;
        return this.TRIAL_ENTITLEMENTS.has(entitlementKey);
    }
    /**
     * Sync iz plana -> entitlements (tx)
     */
    async syncFromPlan(orgId, subscription, tx) {
        const cleanOrgId = String(orgId ?? '').trim();
        if (!cleanOrgId)
            throw new DomainError('orgId is required');
        const planKey = String(subscription.planKey ?? '').trim().toLowerCase();
        if (!planKey) {
            throw new DomainError('subscription plan is required for entitlement sync');
        }
        const mapped = PLAN_ENTITLEMENTS[planKey];
        if (!mapped) {
            throw new DomainError(`Unsupported plan for entitlements: ${planKey}`);
        }
        await this.entitlementRepository.replaceActiveEntitlements(tx, {
            orgId: cleanOrgId,
            entitlementKeys: mapped,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
        });
    }
    async deactivateForSubscription(orgId, stripeSubscriptionId, tx) {
        const cleanOrgId = String(orgId ?? '').trim();
        if (!cleanOrgId)
            throw new DomainError('orgId is required');
        await this.entitlementRepository.deactivateEntitlements(tx, {
            orgId: cleanOrgId,
            stripeSubscriptionId,
        });
    }
    /**
     * Trial helper:
     * - Trial je aktiven samo, če imamo trial_started_at in trial_ends_at
     * - in je "now" znotraj [start, end]
     */
    async isTrialActive(orgId) {
        const window = await this.entitlementRepository.getOrgTrialWindow({ orgId });
        if (!window)
            return false;
        const startedAt = window.trialStartedAt ?? null;
        const endsAt = window.trialEndsAt ?? null;
        if (!startedAt || !endsAt)
            return false;
        const startMs = new Date(String(startedAt)).getTime();
        const endMs = new Date(String(endsAt)).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs))
            return false;
        const now = Date.now();
        return now >= startMs && now <= endMs;
    }
}
