import "server-only";

import {
  AirshipOpenAIByokProviderService,
  AIRSHIP_OPENAI_BYOK_PROVIDER_VERSION,
} from "@/gnr8/single-site/airship-openai-byok-provider";
import { airshipChsDraftContainsForbiddenMaverCopy } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

export type AirshipHeroAICommandFields = {
  headline: string;
  subheading: string;
  ctaLabel: string;
  topPadding: number;
  bottomPadding: number;
  backgroundTint: string;
  ctaColor: string;
};

export type AirshipHeroAICommandResult = {
  fields: AirshipHeroAICommandFields;
  changedTextFields: Array<"headline" | "subheading" | "ctaLabel">;
  changedStyleFields: Array<"topPadding" | "bottomPadding" | "backgroundTint" | "ctaColor">;
  message: string;
  supported: boolean;
  provider: "openai";
  rawProviderPayloadsPersisted: false;
  redactions: string[];
  mutationFlags: {
    draftDataMutation: boolean;
    liveSiteMutation: false;
    runtimeVersionMutation: false;
    activePointerMutation: false;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
  };
};

type OpenAIResponsesCaller = (input: { apiKey: string; model: string; prompt: string }) => Promise<{ status: number; outputText: string }>;

type AirshipAICommandDeps = {
  providerService: Pick<AirshipOpenAIByokProviderService, "readServerCredential" | "markTestResult">;
  callOpenAI: OpenAIResponsesCaller;
};

const REDACTIONS = ["apiKey", "authorizationHeader", "rawProviderRequest", "rawProviderResponse", "prompt", "completion", "secrets", "tokens", "cookies"];
const FORBIDDEN_COMMAND = /\b(publish|rollback|dry[-\s]?run|shadow[-\s]?publish|active pointer|live site|dns|domain|billing|stripe|source capture)\b/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clampSpacing(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(24, Math.min(140, Math.round(numeric)));
}

function safeColor(value: unknown, fallback: string): string {
  const normalized = text(value, 12);
  return HEX_COLOR.test(normalized) ? normalized.toLowerCase() : fallback;
}

export function sanitizeAirshipAICommand(value: unknown): string {
  return text(value, 500).replace(/\s+/g, " ");
}

export function normalizeAirshipHeroAIFields(value: unknown): AirshipHeroAICommandFields | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const headline = text(record.headline, 220);
  const subheading = text(record.subheading, 600);
  const ctaLabel = text(record.ctaLabel, 140);
  if (!headline || !subheading) return null;
  const fields = {
    headline,
    subheading,
    ctaLabel,
    topPadding: clampSpacing(record.topPadding, 72),
    bottomPadding: clampSpacing(record.bottomPadding, 72),
    backgroundTint: safeColor(record.backgroundTint, "#ecfeff"),
    ctaColor: safeColor(record.ctaColor, "#0f766e"),
  };
  if (airshipChsDraftContainsForbiddenMaverCopy(fields)) return null;
  return fields;
}

function fieldChanges(before: AirshipHeroAICommandFields, after: AirshipHeroAICommandFields) {
  const changedTextFields: AirshipHeroAICommandResult["changedTextFields"] = [];
  const changedStyleFields: AirshipHeroAICommandResult["changedStyleFields"] = [];
  if (before.headline !== after.headline) changedTextFields.push("headline");
  if (before.subheading !== after.subheading) changedTextFields.push("subheading");
  if (before.ctaLabel !== after.ctaLabel) changedTextFields.push("ctaLabel");
  if (before.topPadding !== after.topPadding) changedStyleFields.push("topPadding");
  if (before.bottomPadding !== after.bottomPadding) changedStyleFields.push("bottomPadding");
  if (before.backgroundTint !== after.backgroundTint) changedStyleFields.push("backgroundTint");
  if (before.ctaColor !== after.ctaColor) changedStyleFields.push("ctaColor");
  return { changedTextFields, changedStyleFields };
}

function result(input: {
  before: AirshipHeroAICommandFields;
  after: AirshipHeroAICommandFields;
  supported: boolean;
  message: string;
}): AirshipHeroAICommandResult {
  const changes = fieldChanges(input.before, input.after);
  return {
    fields: input.after,
    ...changes,
    message: input.message,
    supported: input.supported,
    provider: "openai",
    rawProviderPayloadsPersisted: false,
    redactions: REDACTIONS,
    mutationFlags: {
      draftDataMutation: changes.changedTextFields.length > 0,
      liveSiteMutation: false,
      runtimeVersionMutation: false,
      activePointerMutation: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
    },
  };
}

function parseProviderJson(outputText: string): Record<string, unknown> | null {
  const normalized = outputText.trim();
  if (!normalized) return null;
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const match = normalized.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function buildPrompt(input: { command: string; fields: AirshipHeroAICommandFields }): string {
  return [
    "You are editing the internal Airship draft preview for CHS d.o.o. (chs.si).",
    "Return JSON only. Never include markdown.",
    "You may only update these fields: headline, subheading, ctaLabel, topPadding, bottomPadding, backgroundTint, ctaColor.",
    "Text changes are draft-only. Style changes are local preview only. Do not publish, deploy, mutate live content, move active pointers, run dry-runs, shadow-publish, rollback, alter DNS/domains/billing, or perform source capture.",
    "Keep CHS identity and IT/cybersecurity/data/hybrid-infrastructure context. Do not introduce transport/Maver copy.",
    `Current fields: ${JSON.stringify(input.fields)}`,
    `Command: ${input.command}`,
    "Response shape: {\"fields\":{\"headline\":\"...\",\"subheading\":\"...\",\"ctaLabel\":\"...\",\"topPadding\":72,\"bottomPadding\":72,\"backgroundTint\":\"#ecfeff\",\"ctaColor\":\"#0f766e\"},\"message\":\"short safe status\"}",
  ].join("\n");
}

async function defaultOpenAIResponsesCaller(input: { apiKey: string; model: string; prompt: string }): Promise<{ status: number; outputText: string }> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
      store: false,
      temperature: 0.2,
      max_output_tokens: 700,
      metadata: {
        gnr8_feature: "airship_editor",
        gnr8_provider_version: AIRSHIP_OPENAI_BYOK_PROVIDER_VERSION,
      },
    }),
  });
  const body = await response.json().catch(() => ({})) as { output_text?: unknown; output?: unknown };
  return {
    status: response.status,
    outputText: text(body.output_text, 8000) || JSON.stringify(body.output ?? ""),
  };
}

export class AirshipAICommandService {
  private readonly deps: AirshipAICommandDeps;

  constructor(deps: Partial<AirshipAICommandDeps> = {}) {
    this.deps = {
      providerService: deps.providerService ?? new AirshipOpenAIByokProviderService(),
      callOpenAI: deps.callOpenAI ?? defaultOpenAIResponsesCaller,
    };
  }

  async run(input: { command: unknown; fields: unknown; actorId: string }): Promise<AirshipHeroAICommandResult> {
    const command = sanitizeAirshipAICommand(input.command);
    const fields = normalizeAirshipHeroAIFields(input.fields);
    if (!command || !fields) {
      throw new Error("airship_ai_command_invalid_input");
    }
    if (FORBIDDEN_COMMAND.test(command)) {
      return result({
        before: fields,
        after: fields,
        supported: false,
        message: "Command blocked by Airship draft boundary. No live site changes were made.",
      });
    }

    const credential = await this.deps.providerService.readServerCredential();
    if (!credential) {
      throw new Error("airship_openai_provider_missing");
    }

    const providerResponse = await this.deps.callOpenAI({
      apiKey: credential.apiKey,
      model: credential.model,
      prompt: buildPrompt({ command, fields }),
    });
    const parsed = parseProviderJson(providerResponse.outputText);
    const nextFields = normalizeAirshipHeroAIFields(parsed?.fields);
    const passed = providerResponse.status >= 200 && providerResponse.status < 300 && nextFields !== null;
    await this.deps.providerService.markTestResult({
      credentialId: credential.credentialId,
      passed,
      actorId: input.actorId,
      statusCode: providerResponse.status,
    });
    if (!passed || !nextFields) {
      throw new Error("airship_openai_provider_response_invalid");
    }

    const providerMessage = text(parsed?.message, 180);
    const changes = fieldChanges(fields, nextFields);
    const textMessage = changes.changedTextFields.length > 0 ? "Text changes are saved to Airship draft only." : "";
    const styleMessage = changes.changedStyleFields.length > 0 ? "Style changes are local preview only. Not live. Not published." : "";
    return result({
      before: fields,
      after: nextFields,
      supported: changes.changedTextFields.length > 0 || changes.changedStyleFields.length > 0,
      message: [providerMessage, textMessage, styleMessage].filter(Boolean).join(" ") || "No draft preview changes were needed.",
    });
  }
}
