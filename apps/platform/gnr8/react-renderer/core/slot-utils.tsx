import { Fragment, type ReactElement, type ReactNode } from "react";

import type { ReactRenderBoundValue, ReactRenderSlotValue } from "@/gnr8/renderer-contract";

const MEDIA_PLACEHOLDER_SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isBoundValue(value: unknown): value is ReactRenderBoundValue {
  if (!isObject(value)) return false;

  return (
    typeof value.kind === "string" &&
    typeof value.valueType === "string" &&
    typeof value.slotPath === "string" &&
    typeof value.slotKey === "string"
  );
}

function coerceText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function resolveTextFromSlot(slotValue: ReactRenderSlotValue | undefined, fallbackLabel: string): string {
  if (!slotValue) return fallbackLabel;

  if (isBoundValue(slotValue)) {
    if (slotValue.kind === "bound_content") {
      return slotValue.contentId ? `[content:${slotValue.contentId}]` : fallbackLabel;
    }

    return coerceText(slotValue.fallbackValue) || fallbackLabel;
  }

  if (Array.isArray(slotValue)) {
    if (slotValue.length === 0) return fallbackLabel;
    return resolveTextFromSlot(slotValue[0], fallbackLabel);
  }

  if (isObject(slotValue)) {
    const key = Object.keys(slotValue)
      .sort((a, b) => stringCmp(a, b))
      .find((candidate) => isBoundValue(slotValue[candidate]));
    if (!key) return fallbackLabel;
    return resolveTextFromSlot(slotValue[key] as ReactRenderSlotValue, fallbackLabel);
  }

  return fallbackLabel;
}

export function resolveUrlFromSlot(slotValue: ReactRenderSlotValue | undefined): string {
  if (!slotValue) return "#";
  if (isBoundValue(slotValue)) {
    if (slotValue.kind === "fallback") {
      const fallbackValue = coerceText(slotValue.fallbackValue);
      return fallbackValue || "#";
    }
    return slotValue.contentId ? `#content-${slotValue.contentId}` : "#";
  }

  if (Array.isArray(slotValue) && slotValue.length > 0) {
    return resolveUrlFromSlot(slotValue[0]);
  }

  if (isObject(slotValue)) {
    const key = Object.keys(slotValue)
      .sort((a, b) => stringCmp(a, b))
      .find((candidate) => isBoundValue(slotValue[candidate]));
    if (!key) return "#";
    return resolveUrlFromSlot(slotValue[key] as ReactRenderSlotValue);
  }

  return "#";
}

export function resolveMediaFromSlot(slotValue: ReactRenderSlotValue | undefined, fallbackAlt: string): {
  src: string;
  alt: string;
} {
  if (!slotValue) {
    return {
      src: MEDIA_PLACEHOLDER_SRC,
      alt: fallbackAlt,
    };
  }

  if (isBoundValue(slotValue)) {
    if (slotValue.kind === "bound_content") {
      return {
        src: MEDIA_PLACEHOLDER_SRC,
        alt: slotValue.contentId ? `Media ${slotValue.contentId}` : fallbackAlt,
      };
    }

    if (isObject(slotValue.fallbackValue)) {
      const fallbackValue = slotValue.fallbackValue as Record<string, unknown>;
      return {
        src: coerceText(fallbackValue.src) || MEDIA_PLACEHOLDER_SRC,
        alt: coerceText(fallbackValue.alt) || fallbackAlt,
      };
    }

    return {
      src: MEDIA_PLACEHOLDER_SRC,
      alt: fallbackAlt,
    };
  }

  if (Array.isArray(slotValue) && slotValue.length > 0) {
    return resolveMediaFromSlot(slotValue[0], fallbackAlt);
  }

  if (isObject(slotValue)) {
    const key = Object.keys(slotValue)
      .sort((a, b) => stringCmp(a, b))
      .find((candidate) => isBoundValue(slotValue[candidate]));
    if (!key) {
      return {
        src: MEDIA_PLACEHOLDER_SRC,
        alt: fallbackAlt,
      };
    }

    return resolveMediaFromSlot(slotValue[key] as ReactRenderSlotValue, fallbackAlt);
  }

  return {
    src: MEDIA_PLACEHOLDER_SRC,
    alt: fallbackAlt,
  };
}

export function resolveListFromSlot(slotValue: ReactRenderSlotValue | undefined, fallbackLabel: string): string[] {
  if (!slotValue) return [];

  if (Array.isArray(slotValue)) {
    return slotValue.map((value, index) => resolveTextFromSlot(value, `${fallbackLabel} ${index + 1}`));
  }

  if (isBoundValue(slotValue)) {
    return [resolveTextFromSlot(slotValue, fallbackLabel)];
  }

  if (isObject(slotValue)) {
    return Object.keys(slotValue)
      .sort((a, b) => stringCmp(a, b))
      .map((key) => resolveTextFromSlot(slotValue[key] as ReactRenderSlotValue, `${fallbackLabel}:${key}`));
  }

  return [];
}

export function renderGenericSlotValue(slotValue: ReactRenderSlotValue | undefined): ReactNode {
  if (!slotValue) return <span data-gnr8-slot-empty="true">[empty]</span>;

  if (isBoundValue(slotValue)) {
    if (slotValue.kind === "bound_content") {
      return <span data-gnr8-slot-kind="bound_content">{slotValue.contentId ? `[content:${slotValue.contentId}]` : "[content]"}</span>;
    }

    if (isObject(slotValue.fallbackValue)) {
      return <code data-gnr8-slot-kind="fallback">{JSON.stringify(slotValue.fallbackValue)}</code>;
    }

    return <span data-gnr8-slot-kind="fallback">{coerceText(slotValue.fallbackValue) || "[fallback]"}</span>;
  }

  if (Array.isArray(slotValue)) {
    return (
      <ol data-gnr8-slot-array="true">
        {slotValue.map((item, index) => (
          <li key={`slot-item-${index}`}>{renderGenericSlotValue(item)}</li>
        ))}
      </ol>
    );
  }

  if (isObject(slotValue)) {
    return (
      <dl data-gnr8-slot-object="true">
        {Object.keys(slotValue)
          .sort((a, b) => stringCmp(a, b))
          .map((key) => (
            <Fragment key={`slot-key-${key}`}>
              <dt>{key}</dt>
              <dd>{renderGenericSlotValue(slotValue[key] as ReactRenderSlotValue)}</dd>
            </Fragment>
          ))}
      </dl>
    );
  }

  return <span data-gnr8-slot-unknown="true">[unsupported-slot]</span>;
}

export function isMalformedSlotValue(slotValue: ReactRenderSlotValue | undefined): boolean {
  if (!slotValue) return false;
  if (isBoundValue(slotValue)) return false;

  if (Array.isArray(slotValue)) {
    return slotValue.some((item) => isMalformedSlotValue(item));
  }

  if (typeof slotValue === "object" && slotValue !== null) {
    return Object.values(slotValue).some((value) => isMalformedSlotValue(value as ReactRenderSlotValue));
  }

  return true;
}

export function slotKeysSorted(slots: Record<string, ReactRenderSlotValue> | undefined): string[] {
  if (!slots) return [];
  return Object.keys(slots).sort((a, b) => stringCmp(a, b));
}

export function stringifyDeterministic(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyDeterministic(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort((a, b) => stringCmp(a, b))
      .map((key) => `${key}:${stringifyDeterministic(record[key])}`)
      .join(",")}}`;
  }

  return "";
}

export function ensureElement(node: ReactNode): ReactElement {
  if (typeof node === "string") return <span>{node}</span>;
  if (typeof node === "number" || typeof node === "boolean") return <span>{String(node)}</span>;
  if (!node) return <span />;
  return node as ReactElement;
}
