import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import { buildAirshipAgencyAISettingsReadModel } from "@/gnr8/single-site/airship-agent-profile-settings";

import { AISettingsView } from "./ai-settings-view";

const { renderToStaticMarkup } = ReactDomServer;

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const VIEW_FILE = new URL("./ai-settings-view.tsx", import.meta.url);
const LAYOUT_FILE = new URL("../layout.tsx", import.meta.url);
const COMMAND_CENTER_LAYOUT_FILE = new URL("../CommandCenterLayout.tsx", import.meta.url);

test("Command Center AI Settings UI renders provider status and default Airship profile", () => {
  const rawKey = "sk-test-raw-key-should-not-render";
  const model = buildAirshipAgencyAISettingsReadModel({
    generatedAt: "2026-09-09T00:00:00.000Z",
    openAIProviderStatus: {
      provider: "openai",
      scope: "airship_editor",
      ownerScope: "internal_superadmin",
      connected: true,
      status: "connected",
      maskedKey: "sk-...safe",
      model: "gpt-5",
      lastTestedAt: null,
      lastTestStatus: "passed",
      createdAt: null,
      updatedAt: null,
      canUseAiCommands: true,
    },
  });
  const html = renderToStaticMarkup(<AISettingsView model={model} />);

  assert.equal(html.includes("AI Settings"), true);
  assert.equal(html.includes("Agency-level configuration"), true);
  assert.equal(html.includes("This is not live-site editing"), true);
  assert.equal(html.includes("OpenAI BYOK"), true);
  assert.equal(html.includes("sk-...safe"), true);
  assert.equal(html.includes("gpt-5"), true);
  assert.equal(html.includes("airship_editor"), true);
  assert.equal(html.includes("Airship Editor Default"), true);
  assert.equal(html.includes("balanced"), true);
  assert.equal(html.includes("Gemini"), true);
  assert.equal(html.includes("Anthropic"), true);
  assert.equal(html.includes("Groq"), true);
  assert.equal(html.includes("OpenRouter"), true);
  assert.equal(html.includes("planned"), true);
  assert.equal(html.includes(rawKey), false);
});

test("Command Center AI Settings UI shows test failed and unavailable profile states compactly", () => {
  const model = buildAirshipAgencyAISettingsReadModel({
    generatedAt: "2026-09-09T00:00:00.000Z",
    openAIProviderStatus: {
      provider: "openai",
      scope: "airship_editor",
      ownerScope: "internal_superadmin",
      connected: true,
      status: "connected",
      maskedKey: "sk-...fail",
      model: "gpt-5",
      lastTestedAt: "2026-09-09T00:00:00.000Z",
      lastTestStatus: "failed",
      createdAt: null,
      updatedAt: null,
      canUseAiCommands: true,
    },
  });
  const html = renderToStaticMarkup(<AISettingsView model={model} />);

  assert.equal(html.includes("test failed"), true);
  assert.equal(html.includes("Connected metadata is present, but the latest provider test failed."), true);
  assert.equal(html.includes("Default Airship profile"), true);
});

test("Command Center AI Settings route is superadmin-gated through layout and wired into navigation", async () => {
  const [pageSource, viewSource, layoutSource, commandCenterLayoutSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(VIEW_FILE, "utf8"),
    readFile(LAYOUT_FILE, "utf8"),
    readFile(COMMAND_CENTER_LAYOUT_FILE, "utf8"),
  ]);

  assert.equal(layoutSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(pageSource.includes("readAirshipAgencyAISettings"), true);
  assert.equal(viewSource.includes("This is not live-site editing"), true);
  assert.equal(commandCenterLayoutSource.includes("/gnr8/command-center/ai-settings"), true);
  assert.equal(commandCenterLayoutSource.includes("AI Settings"), true);
  assert.equal(pageSource.includes("readServerCredential"), false);
  assert.equal(pageSource.includes("fetch("), false);
  assert.equal(viewSource.includes("Save key"), false);
  assert.equal(viewSource.includes("Test connection"), false);
  assert.equal(viewSource.includes("Revoke key"), false);
});
