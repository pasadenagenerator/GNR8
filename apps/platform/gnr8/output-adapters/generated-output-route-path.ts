const ENCODED_ROUTE_SEGMENT = /^(?:[a-z0-9._~-]|%[0-9a-f]{2})+$/i;
const UNSAFE_DECODED_ROUTE_SEGMENT = /[\u0000-\u001f\u007f/\\?#]/;

export function encodeGeneratedOutputRoutePath(value: string): string {
  const raw = String(value ?? "").trim();
  if (raw === "/") return "/";
  if (!raw.startsWith("/") || raw.endsWith("/") || raw.includes("//")) {
    throw new Error(`invalid_generated_output_route:${value}`);
  }
  const encoded = `/${raw.slice(1).split("/").map((segment) => {
    const decoded = decodeRouteSegment(segment, value);
    return encodeURIComponent(decoded).replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }).join("/")}`;
  if (!isGeneratedOutputRoutePath(encoded)) throw new Error(`invalid_generated_output_route:${value}`);
  return encoded;
}

export function decodeGeneratedOutputRoutePathForFile(value: string): string {
  if (!isGeneratedOutputRoutePath(value) || value === "/") {
    throw new Error(`invalid_generated_output_route:${value}`);
  }
  return value.slice(1).split("/").map((segment) => decodeRouteSegment(segment, value)).join("/");
}

export function isGeneratedOutputRoutePath(value: unknown): value is string {
  if (value === "/") return true;
  if (typeof value !== "string" || !value.startsWith("/") || value.endsWith("/") || value.includes("//")) return false;
  return value.slice(1).split("/").every((segment) => {
    if (!ENCODED_ROUTE_SEGMENT.test(segment)) return false;
    try {
      const decoded = decodeURIComponent(segment).normalize("NFC");
      if (!decoded || decoded === "." || decoded === ".." || UNSAFE_DECODED_ROUTE_SEGMENT.test(decoded)) return false;
      return encodeURIComponent(decoded).replace(/[!'()*]/g, (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      ) === segment;
    } catch {
      return false;
    }
  });
}

function decodeRouteSegment(segment: string, route: string): string {
  try {
    const decoded = decodeURIComponent(segment).normalize("NFC");
    if (!decoded || decoded === "." || decoded === ".." || UNSAFE_DECODED_ROUTE_SEGMENT.test(decoded)) {
      throw new Error(`invalid_generated_output_route:${route}`);
    }
    return decoded;
  } catch (error) {
    if (error instanceof Error && error.message === `invalid_generated_output_route:${route}`) throw error;
    throw new Error(`invalid_generated_output_route:${route}`, { cause: error });
  }
}
