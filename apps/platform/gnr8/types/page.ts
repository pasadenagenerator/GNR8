import type { Gnr8Section } from "@/gnr8/types/section";
import type { PageMigrationGateResult } from "@/gnr8/migration/quality-gates/page-quality-gate";
import type { PageRolloutPolicyResult } from "@/gnr8/migration/policy/page-rollout-policy";
import type { PageEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";

export type MigrationDiagnostics = {
  pageStructuralConfidence: number;
  weakSectionIds: string[];
  structuralAnomalies: string[];
  pageMigrationGate: PageMigrationGateResult;
  pageRolloutPolicy: PageRolloutPolicyResult;
  pageEnforcement: PageEnforcementByStage;
};

export type Gnr8Page = {
  id: string;
  slug: string;
  title?: string;
  sections: Gnr8Section[];
  migrationDiagnostics?: MigrationDiagnostics;
};
