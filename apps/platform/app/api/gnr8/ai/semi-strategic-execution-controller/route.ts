import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildAutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import { buildMixedWaveExecutionDesign } from "@/gnr8/ai/mixed-wave-execution-design";
import { buildMixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import { buildOrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import { buildSemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { buildStrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function isGnr8Page(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections)) return false;
  if (typeof value.title !== "undefined" && typeof value.title !== "string") return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const pagesRaw = body.pages;
    if (!Array.isArray(pagesRaw)) {
      return NextResponse.json({ error: "pages must be an array" }, { status: 400 });
    }
    if (pagesRaw.length < 1) {
      return NextResponse.json({ error: "At least 1 page is required" }, { status: 400 });
    }

    const waveIdRaw = body.waveId;
    if (typeof waveIdRaw !== "undefined" && typeof waveIdRaw !== "string") {
      return NextResponse.json({ error: "waveId must be a string" }, { status: 400 });
    }
    const waveId = typeof waveIdRaw === "string" ? waveIdRaw.trim() : "";

    const normalizedInputPages: Array<{ slug: string; page?: Gnr8Page }> = [];
    for (let i = 0; i < pagesRaw.length; i += 1) {
      const item = pagesRaw[i] as unknown;
      if (!isRecord(item)) {
        return NextResponse.json({ error: `Invalid pages[${i}] item` }, { status: 400 });
      }

      const slugRaw = typeof item.slug === "string" ? item.slug : "";
      const slug = normalizeSlug(slugRaw);
      if (!slug) {
        return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
      }

      if (typeof item.page !== "undefined" && !isRecord(item.page)) {
        return NextResponse.json({ error: `pages[${i}].page must be an object` }, { status: 400 });
      }

      const page = typeof item.page === "undefined" ? undefined : item.page;

      normalizedInputPages.push({
        slug,
        page: isGnr8Page(page) ? (page as Gnr8Page) : undefined,
      });
    }

    const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
    const unresolvedPages: string[] = [];

    for (const p of normalizedInputPages) {
      if (p.page) {
        const normalizedInline: Gnr8Page = {
          ...p.page,
          slug: p.slug,
        };
        resolvedPages.push({ slug: p.slug, page: normalizedInline });
        continue;
      }

      const loaded = await getPageBySlug(p.slug).catch(() => null);
      if (!loaded) {
        unresolvedPages.push(p.slug);
        continue;
      }

      const normalizedLoaded: Gnr8Page = {
        ...loaded,
        slug: p.slug,
      };
      resolvedPages.push({ slug: p.slug, page: normalizedLoaded });
    }

    const siteSemanticIntelligence = buildSiteSemanticIntelligence({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
    });

    const siteSemanticConsistency = buildSiteSemanticConsistency({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
    });

    const strategicSemanticReasoning = buildStrategicSemanticReasoning({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
    });

    const strategicSemanticPlan = buildStrategicSemanticPlan({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
    });

    const strategicSemanticExecutionReadiness = buildStrategicSemanticExecutionReadiness({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
      strategicSemanticPlan,
    });

    const strategicExecutionOrchestration = buildStrategicExecutionOrchestration({
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticPlan,
      strategicSemanticExecutionReadiness,
    });

    const { orchestrationPreview } = buildOrchestrationPreview({
      strategicExecutionOrchestration,
      unresolvedPages,
    });

    const { mixedWaveExecutionDesign } = buildMixedWaveExecutionDesign({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      strategicSemanticExecutionReadiness,
      strategicSemanticReasoning,
    });

    const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      waveId: waveId.length > 0 ? waveId : undefined,
      strategicExecutionOrchestration,
      strategicSemanticPlan,
      mixedWaveExecutionDesign,
    });

    const { strategicWaveExecutionController } = buildStrategicWaveExecutionController({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      waveId: waveId.length > 0 ? waveId : undefined,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
      strategicSemanticExecutionReadiness,
      strategicExecutionOrchestration,
      orchestrationPreview,
      mixedWavePreviewDesign,
    });

    const { autonomousExecutionPolicy } = buildAutonomousExecutionPolicy({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      waveId: waveId.length > 0 ? waveId : undefined,
      strategicWaveExecutionController,
      strategicSemanticExecutionReadiness,
      orchestrationPreview,
      mixedWavePreviewDesign,
      strategicSemanticReasoning,
      siteSemanticIntelligence,
      siteSemanticConsistency,
    });

    const { semiStrategicExecutionController } = buildSemiStrategicExecutionController({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      strategicWaveExecutionController,
      autonomousExecutionPolicy,
      strategicExecutionOrchestration,
      orchestrationPreview,
      strategicSemanticExecutionReadiness,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      mixedWavePreviewDesign,
    });

    return NextResponse.json(
      {
        resolvedPages: resolvedPages.length,
        unresolvedPages,
        semiStrategicExecutionController,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

