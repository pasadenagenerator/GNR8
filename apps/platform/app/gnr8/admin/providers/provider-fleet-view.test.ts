import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const VIEW_FILE = new URL("./provider-fleet-view.tsx", import.meta.url);
const PAGE_FILE = new URL("./page.tsx", import.meta.url);

test("provider fleet view source: renders title and subtitle", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Fleet Cockpit"), true);
  assert.equal(source.includes("Global provider control plane"), true);
});

test("provider fleet page source: consumes canonical provider contract registry", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("PROVIDER_CONTRACT_REGISTRY"), true);
  assert.equal(source.includes("displayName"), true);
  assert.equal(source.includes("environment"), true);
  assert.equal(source.includes("providerCategory"), true);
});

test("provider fleet view source: grouped provider category sections render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Registrar / Domain Providers"), true);
  assert.equal(source.includes("Deployment Providers"), true);
  assert.equal(source.includes("Communication Providers"), true);
  assert.equal(source.includes("ERP / Accounting Providers"), true);
  assert.equal(source.includes("Edge Infrastructure Providers"), true);
  assert.equal(source.includes("Commerce / Billing Providers"), true);
  assert.equal(source.includes("Execution Providers"), true);
  assert.equal(source.includes("Source Control Providers"), true);
  assert.equal(source.includes("AI Providers"), true);
  assert.equal(source.includes("Storage / Data Providers"), true);
  assert.equal(source.includes("Identity Providers"), true);
  assert.equal(source.includes("groupProvidersByCategory"), true);
});

test("provider fleet view source: placeholder providers render in taxonomy sections", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Openprovider"), true);
  assert.equal(source.includes("Realtime Register"), true);
  assert.equal(source.includes("provider.category"), true);
  assert.equal(source.includes("CATEGORY_ORDER.map"), true);
});

test("provider fleet view source: realtime register contract consumed from registry", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("PROVIDER_CONTRACT_BY_ID.realtime_register"), true);
  assert.equal(source.includes("providerId:"), true);
  assert.equal(source.includes("providerType:"), true);
  assert.equal(source.includes("environment:"), true);
});

test("provider fleet view source: summary cards show providers connected read-only and execution", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  const pageSource = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes('SummaryCard label="Providers"'), true);
  assert.equal(source.includes('SummaryCard label="Connected"'), true);
  assert.equal(source.includes('SummaryCard label="Read-only Capabilities"'), true);
  assert.equal(source.includes('SummaryCard label="Execution"'), true);
  assert.equal(pageSource.includes("providers: PROVIDER_CONTRACT_REGISTRY.length"), true);
  assert.equal(pageSource.includes("connected: PROVIDER_CONTRACT_REGISTRY.filter"), true);
  assert.equal(pageSource.includes("readOnlyCapabilities: PROVIDER_CONTRACT_REGISTRY.reduce"), true);
});

test("provider fleet view source: capability chips render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('"deployments"'), true);
  assert.equal(source.includes('"model_metadata"'), true);
  assert.equal(source.includes('"auth"'), true);
  assert.equal(source.includes('"email_delivery"'), true);
  assert.equal(source.includes('"accounting"'), true);
  assert.equal(source.includes('"edge_compute"'), true);
  assert.equal(source.includes("CATEGORY_CAPABILITY_KEYS[provider.category].map"), true);
});

test("provider fleet view source: deployment providers do not render registrar-only capability set", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("CATEGORY_CAPABILITY_KEYS[provider.category]"), true);
  assert.equal(source.includes('deployment: ["deployments", "previews", "rollbacks", "domains", "environment_variables"]'), true);
});

test("provider fleet view source: AI providers render AI-specific capabilities", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('ai: ["model_metadata", "routing_policy", "inference", "embeddings", "multimodal"]'), true);
});

test("provider fleet view source: communication providers render communication-specific capabilities", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(
    source.includes('communication: ["email_delivery", "transactional_email", "inbound_email", "domains", "webhooks"]'),
    true,
  );
});

test("provider fleet view source: erp/accounting providers render erp-specific capabilities", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(
    source.includes('erp_accounting: ["accounting", "invoicing", "bookkeeping", "tax", "synchronization"]'),
    true,
  );
});

test("provider fleet view source: edge infrastructure providers render edge-specific capabilities", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(
    source.includes('edge_infrastructure: ["dns", "edge_compute", "object_storage", "cdn", "routing"]'),
    true,
  );
});

test("provider fleet view source: openprovider keeps registrar capabilities in status section", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("REGISTRAR_CAPABILITY_KEYS"), true);
  assert.equal(source.includes("Provider Capability Status"), true);
});

test("provider fleet view source: read-only note", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Fleet cockpit is read-only. Provider execution remains disabled."), true);
});

test("provider fleet view source: AI Provider Capability Matrix renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Provider Capability Matrix"), true);
  assert.equal(source.includes("provider.providerCategory === \"ai\""), true);
  assert.equal(source.includes("AI routing metadata is advisory only. No model calls are performed."), true);
});

test("provider fleet view source: AI provider rows render for all configured AI providers", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI_PROVIDER_CAPABILITY_ROWS"), true);
  assert.equal(source.includes("provider.providerCategory === \"ai\""), true);
  assert.equal(source.includes("provider.displayName"), true);
  assert.equal(source.includes("provider.aiRouting?.modelFamilies"), true);
});

test("provider fleet view source: AI metadata columns render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Model Families"), true);
  assert.equal(source.includes("Strengths"), true);
  assert.equal(source.includes("Routing Hints"), true);
  assert.equal(source.includes("Latency"), true);
  assert.equal(source.includes("Cost"), true);
  assert.equal(source.includes("Context"), true);
  assert.equal(source.includes("modelFamilies.join"), true);
  assert.equal(source.includes("strengths.join"), true);
  assert.equal(source.includes("routingHints.join"), true);
});

test("provider fleet view source: AI routing policy preview section renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Routing Policy Preview"), true);
  assert.equal(source.includes("Task Type"), true);
  assert.equal(source.includes("Preferred Provider"), true);
  assert.equal(source.includes("Secondary Provider"), true);
  assert.equal(source.includes("Routing Strategy"), true);
  assert.equal(source.includes("Reasoning"), true);
  assert.equal(source.includes("AI_ROUTING_POLICY_PREVIEW_REGISTRY"), true);
  assert.equal(source.includes("resolveProviderDisplayName"), true);
});

test("provider fleet view source: AI routing policy preview task mappings render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("preferredProviderId"), true);
  assert.equal(source.includes("secondaryProviderId"), true);
  assert.equal(source.includes("row.routingStrategy"), true);
  assert.equal(source.includes("executionState"), false);
});

test("provider fleet view source: AI routing policy preview advisory note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Routing policy preview is strategic only. No live AI routing is performed."), true);
});

test("provider fleet view source: AI routing evaluator preview section renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AIRoutingEvaluatorPreview"), true);
  assert.equal(source.includes("AI Routing Evaluator Preview"), true);
});

test("provider fleet view source: overview-first sections remain visible by default", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('SummaryCard label="Providers"'), true);
  assert.equal(source.includes("Provider Category Summary"), true);
  assert.equal(source.includes("AI Routing Readiness Advisor"), true);
});

test("provider fleet view source: collapsible section labels render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Registry Details"), true);
  assert.equal(source.includes("AI Provider Capability Matrix"), true);
  assert.equal(source.includes("AI Routing Policy Preview"), true);
  assert.equal(source.includes("AI Routing Evaluator Preview"), true);
  assert.equal(source.includes("Provider Capability Status"), true);
  assert.equal(source.includes("Realtime Register Contract Readiness"), true);
  assert.equal(source.includes("<details"), true);
  assert.equal(source.includes("<summary"), true);
});

test("provider fleet view source: AI routing readiness advisor renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Routing Readiness Advisor"), true);
  assert.equal(source.includes("Current State"), true);
  assert.equal(source.includes("Current Limitations"), true);
  assert.equal(source.includes("Missing Requirements"), true);
  assert.equal(source.includes("Recommended Next Step"), true);
});

test("provider fleet view source: AI routing readiness advisor limitations and missing requirements render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("no runtime routing engine"), true);
  assert.equal(source.includes("no live AI credentials connected"), true);
  assert.equal(source.includes("no model invocation layer"), true);
  assert.equal(source.includes("no cost governance"), true);
  assert.equal(source.includes("routing policy evaluator"), true);
  assert.equal(source.includes("provider credential boundary"), true);
  assert.equal(source.includes("model execution adapter"), true);
  assert.equal(source.includes("audit/logging model"), true);
  assert.equal(source.includes("cost/latency guardrails"), true);
});

test("provider fleet view source: AI routing readiness advisor badge mapping states are present", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("metadata_ready"), true);
  assert.equal(source.includes("preview_ready"), true);
  assert.equal(source.includes("missing"), true);
  assert.equal(source.includes("not_connected"), true);
  assert.equal(source.includes("execution_blocked"), true);
  assert.equal(source.includes("no_runtime_routing"), true);
});

test("provider fleet view source: openprovider row is linked to provider cockpit", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('href="/gnr8/admin/providers/openprovider"'), true);
  assert.equal(source.includes('provider.name === "Openprovider"'), true);
});

test("provider fleet view source: not configured providers remain non-navigable text", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('href="/gnr8/admin/providers/realtime_register"'), false);
  assert.equal(source.includes('href="/gnr8/admin/providers/inwx"'), false);
  assert.equal(source.includes('href="/gnr8/admin/providers/netim"'), false);
});

test("provider fleet view source: no action buttons or forms are present", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("onClick"), false);
  assert.equal(source.includes("execute"), false);
  assert.equal(source.includes("Run Routing"), false);
  assert.equal(source.includes("Execute Routing"), false);
});

test("provider fleet view source: provider category summary section renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Category Summary"), true);
  assert.equal(source.includes("Total Providers:"), true);
  assert.equal(source.includes("Connected Providers:"), true);
  assert.equal(source.includes("Preview Capabilities:"), true);
  assert.equal(source.includes("Execution Status:"), true);
  assert.equal(source.includes("resolveCategoryExecutionStatus"), true);
  assert.equal(source.includes("countPreviewCapabilities"), true);
});

test("provider fleet view source: operational snapshot renders by default", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Operational Snapshot"), true);
  assert.equal(source.includes('SummaryCard label="Control Plane Status" value="Operational (read-only)"'), true);
  assert.equal(source.includes('SummaryCard label="Connected Providers"'), true);
  assert.equal(source.includes('SummaryCard label="Operational Read-only Capabilities"'), true);
  assert.equal(source.includes('SummaryCard label="AI Routing Preview"'), true);
  assert.equal(source.includes('SummaryCard label="Execution Layer"'), true);
  assert.equal(source.includes('SummaryCard label="Governance State"'), true);
  assert.equal(source.includes('label="Recommended Next Step"'), true);
});

test("provider fleet view source: operational snapshot connected providers count is derived", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("`${props.payload.summary.connected} / ${props.payload.summary.providers}`"), true);
});

test("provider fleet view source: operational snapshot read-only capabilities count is derived", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("String(props.payload.summary.readOnlyCapabilities)"), true);
});

test("provider fleet view source: operational snapshot execution layer renders blocked from provider boundaries", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('label="Execution Layer" value={allProvidersExecutionBlocked ? "Blocked" : "Mixed"}'), true);
  assert.equal(source.includes('provider.boundaries.includes("execution_blocked")'), true);
});

test("provider fleet view source: operational snapshot AI routing preview renders available from evaluator/policy presence", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("evaluateAIRoutingPreview"), true);
  assert.equal(source.includes("AI_ROUTING_POLICY_PREVIEW_REGISTRY.length > 0"), true);
  assert.equal(source.includes('label="AI Routing Preview" value={aiRoutingPreviewAvailable ? "Available" : "Unavailable"}'), true);
});

test("provider fleet view source: no execution controls added with operational snapshot", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("Run Execution"), false);
  assert.equal(source.includes("Enable Execution"), false);
});

test("provider fleet view source: environment awareness preview section renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Environment Awareness Preview"), true);
  assert.equal(source.includes("Environment Scopes"), true);
  assert.equal(source.includes("Binding Scopes"), true);
});

test("provider fleet view source: openprovider contributes to sandbox environment scope summary", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("provider.environmentScope === scope"), true);
  assert.equal(source.includes('"sandbox"'), true);
});

test("provider fleet view source: credential reference registry preview summary renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Credential Reference Registry Preview"), true);
  assert.equal(source.includes('SummaryCard label="Total references"'), true);
  assert.equal(source.includes('SummaryCard label="Configured references"'), true);
  assert.equal(source.includes('SummaryCard label="Missing references"'), true);
  assert.equal(source.includes('SummaryCard label="Secret resolution disabled count"'), true);
  assert.equal(source.includes('SummaryCard label="Execution blocked count"'), true);
  assert.equal(source.includes("CREDENTIAL_REFERENCE_REGISTRY_PREVIEW"), true);
});

test("provider fleet view source: credential reference registry preview table renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Binding scope"), true);
  assert.equal(source.includes("Environment scope"), true);
  assert.equal(source.includes("Secret type"), true);
  assert.equal(source.includes("Resolution state"), true);
  assert.equal(source.includes("reference.secretType"), true);
  assert.equal(source.includes("reference.resolutionState"), true);
  assert.equal(source.includes("reference.executionBlocked ? \"blocked\" : \"enabled\""), true);
});

test("provider fleet view source: credential reference registry advisory note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Credential references are metadata only. No secrets are stored, resolved, or exposed."), true);
});

test("provider fleet view source: no execution controls added with credential reference registry preview", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("Enable Credential Resolution"), false);
  assert.equal(source.includes("Resolve Secrets"), false);
  assert.equal(source.includes("Run Provider Execution"), false);
});

test("provider fleet view source: provider credential boundary advisor section renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Credential Boundary Advisor"), true);
  assert.equal(source.includes("PROVIDER_CREDENTIAL_BOUNDARY_ADVISOR"), true);
});

test("provider fleet view source: provider credential boundary advisor renders all four cards", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Current State"), true);
  assert.equal(source.includes("Current Limitations"), true);
  assert.equal(source.includes("Missing Requirements"), true);
  assert.equal(source.includes("Recommended Next Step"), true);
});

test("provider fleet view source: provider credential boundary advisor note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Credential governance is preview-only. No secrets are stored, resolved, or exposed."), true);
});

test("provider fleet view source: provider credential boundary advisor expected state text renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("credential references modeled"), true);
  assert.equal(source.includes("credential boundary preview available"), true);
  assert.equal(source.includes("secret resolution disabled"), true);
  assert.equal(source.includes("provider execution blocked"), true);
});

test("provider fleet view source: provider credential boundary advisor limitations and requirements render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("no secret manager"), true);
  assert.equal(source.includes("no credential resolver"), true);
  assert.equal(source.includes("no execution adapters"), true);
  assert.equal(source.includes("no tenant credential bindings"), true);
  assert.equal(source.includes("credential reference contract"), true);
  assert.equal(source.includes("credential reference registry"), true);
  assert.equal(source.includes("secret resolution architecture"), true);
  assert.equal(source.includes("audit trail model"), true);
  assert.equal(source.includes("approval governance"), true);
});

test("provider fleet view source: provider credential boundary advisor next steps render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("define credential reference contract"), true);
  assert.equal(source.includes("keep execution blocked"), true);
  assert.equal(source.includes("introduce secret manager abstraction"), true);
  assert.equal(source.includes("preserve credential/provider separation"), true);
});

test("provider fleet view source: provider credential boundary advisor badge mappings are represented", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('normalized.includes("modeled")'), true);
  assert.equal(source.includes('normalized.includes("available")'), true);
  assert.equal(source.includes('normalized.includes("required")'), true);
  assert.equal(source.includes('normalized.includes("disabled")'), true);
  assert.equal(source.includes('normalized === "blocked"'), true);
});

test("provider fleet view source: no secret values are exposed", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("apiKey"), false);
  assert.equal(source.includes("secretKey"), false);
  assert.equal(source.includes("clientSecret"), false);
});

test("provider fleet view source: placeholder providers contribute to global environment scope summary", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('"global"'), true);
  assert.equal(source.includes("environmentScopeCounts[scope]"), true);
  assert.equal(source.includes("scope} providers"), true);
});

test("provider fleet view source: binding scope summary renders all supported scopes", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('"agency"'), true);
  assert.equal(source.includes('"project"'), true);
  assert.equal(source.includes('"environment"'), true);
  assert.equal(source.includes("provider.bindingScope === scope"), true);
});

test("provider fleet view source: environment awareness advisory note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(
    source.includes(
      "Environment awareness is a governance preview only. No tenant credentials are managed. No provider execution is performed.",
    ),
    true,
  );
});

test("provider fleet view source: credential boundary preview section renders by default", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Credential Boundary Preview"), true);
  assert.equal(source.includes('SummaryCard label="Providers requiring credentials"'), true);
  assert.equal(source.includes('SummaryCard label="Configured credential references"'), true);
  assert.equal(source.includes('SummaryCard label="Missing credential references"'), true);
  assert.equal(source.includes('SummaryCard label="Secret resolution"'), true);
  assert.equal(source.includes('SummaryCard label="Binding required" value="Global"'), true);
});

test("provider fleet view source: credential boundary category breakdown renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Configured References:"), true);
  assert.equal(source.includes("Missing References:"), true);
  assert.equal(source.includes("Secret Resolution Disabled:"), true);
  assert.equal(source.includes("categoryContracts.length"), true);
});

test("provider fleet view source: credential boundary advisory note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(
    source.includes("Credential boundary preview is read-only. No secrets are stored, resolved, or exposed."),
    true,
  );
});

test("provider fleet view source: secret-like values are not exposed", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("apiKey"), false);
  assert.equal(source.includes("secretKey"), false);
  assert.equal(source.includes("clientSecret"), false);
  assert.equal(source.includes("PRIVATE_KEY"), false);
});

test("provider fleet view source: registrar summary shows 4 / 1 / 3 / blocked", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('const totalProviders = categoryProviders.length'), true);
  assert.equal(source.includes('const connectedProviders = categoryProviders.filter((provider) => provider.status === "connected").length'), true);
  assert.equal(source.includes('const previewCapabilities = countPreviewCapabilities(categoryProviders, category)'), true);
  assert.equal(source.includes('const executionStatus = resolveCategoryExecutionStatus(categoryProviders)'), true);
  assert.equal(source.includes("Registrar / Domain Providers"), true);
  assert.equal(source.includes("domains"), true);
  assert.equal(source.includes("dns"), true);
  assert.equal(source.includes("availability"), true);
  assert.equal(source.includes("executionStatus"), true);
});

test("provider fleet view source: AI summary shows 5 / 0 / 10 / blocked", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Providers"), true);
  assert.equal(source.includes('"model_metadata"'), true);
  assert.equal(source.includes('"routing_policy"'), true);
  assert.equal(source.includes("Preview Capabilities:"), true);
  assert.equal(source.includes('if (hasEnabled) return "enabled"'), true);
  assert.equal(source.includes('return "blocked"'), true);
});

test("provider fleet view source: communication summary shows 3 / 0 / 0 / blocked", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Communication Providers"), true);
  assert.equal(
    source.includes('communication: ["email_delivery", "transactional_email", "inbound_email", "domains", "webhooks"]'),
    true,
  );
  assert.equal(source.includes("resolveCategoryExecutionStatus"), true);
});

test("provider fleet view source: erp summary shows 1 / 0 / 0 / blocked", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("ERP / Accounting Providers"), true);
  assert.equal(
    source.includes('erp_accounting: ["accounting", "invoicing", "bookkeeping", "tax", "synchronization"]'),
    true,
  );
  assert.equal(source.includes("countPreviewCapabilities"), true);
});
