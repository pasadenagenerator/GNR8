import type { Gnr8Section } from "@/gnr8/types/section";

export type MigrationDiagnostics = {
  pageStructuralConfidence: number;
  weakSectionIds: string[];
  structuralAnomalies: string[];
};

export type Gnr8Page = {
  id: string;
  slug: string;
  title?: string;
  sections: Gnr8Section[];
  migrationDiagnostics?: MigrationDiagnostics;
};
