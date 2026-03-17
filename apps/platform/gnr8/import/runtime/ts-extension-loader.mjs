import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function isRelativeSpecifier(specifier) {
  return typeof specifier === "string" && (specifier.startsWith("./") || specifier.startsWith("../"));
}

function hasExplicitExtension(specifier) {
  return path.extname(specifier) !== "";
}

export async function resolve(specifier, context, nextResolve) {
  if (isRelativeSpecifier(specifier) && !hasExplicitExtension(specifier) && context.parentURL?.startsWith("file:")) {
    const parentPath = fileURLToPath(context.parentURL);
    const candidate = path.resolve(path.dirname(parentPath), `${specifier}.ts`);
    if (fs.existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  return nextResolve(specifier, context);
}

