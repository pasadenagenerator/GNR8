import { EntitlementService } from '../entitlement/service';
import type { BillingRepository } from './repository';
import type { StripeWebhookEvent } from './types';
export declare class BillingService {
    private readonly billingRepository;
    private readonly entitlementService;
    constructor(billingRepository: BillingRepository, entitlementService: EntitlementService);
    handleStripeWebhook(event: StripeWebhookEvent): Promise<void>;
}
//# sourceMappingURL=service.d.ts.map