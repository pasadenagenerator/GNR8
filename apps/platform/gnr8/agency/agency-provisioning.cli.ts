import { provisionAgency } from "@/gnr8/agency/agency-provisioning-service";

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(`--${flag}`);
}

function readArg(flag: string): string | null {
  const prefix = `--${flag}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!found) return null;
  const value = found.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
}

async function main(): Promise<void> {
  const agencyName = readArg("agency-name");
  const agencySlug = readArg("agency-slug");
  const ownerUserId = readArg("owner-user-id");

  if (!agencyName || !agencySlug || !ownerUserId) {
    console.error(
      "Usage: --agency-name=<name> --agency-slug=<slug> --owner-user-id=<uuid> [--owner-role=owner|admin|member] [--default-client-name=<name>] [--dry-run] [--json]",
    );
    process.exitCode = 1;
    return;
  }

  const ownerRole = readArg("owner-role") ?? "owner";
  const defaultClientName = readArg("default-client-name");
  const dryRun = hasFlag("dry-run");
  const jsonOnly = hasFlag("json");

  const result = await provisionAgency({
    agencyName,
    agencySlug,
    ownerUserId,
    ownerRole: ownerRole as "owner" | "admin" | "member",
    defaultClientName,
    dryRun,
  });

  console.log(`[gnr8.agency.provisioning] ${JSON.stringify(result)}`);

  if (jsonOnly) return;

  console.log("GNR8 Agency Provisioning");
  console.log(`mode=${result.dryRun ? "dry-run" : "apply"} agency_id=${result.agency.id} slug=${result.agency.slug}`);
  console.log(`agency_org_id=${result.agencyOrganization.id} owner_user_id=${result.bootstrapMembership.user_id}`);
  console.log(`billing_account_id=${result.billingAccount.id} agency_cost_center_id=${result.agencyCostCenter.id}`);
  if (result.defaultClientOrganization) {
    console.log(
      `default_client_org_id=${result.defaultClientOrganization.id} default_client_cost_center_id=${result.defaultClientOrganization.cost_center_id ?? "n/a"}`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[gnr8.agency.provisioning.error] ${message}`);
  process.exitCode = 1;
});
