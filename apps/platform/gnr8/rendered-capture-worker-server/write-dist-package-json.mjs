import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const platformRoot = path.resolve(__dirname, "../..");
const distRoot = path.resolve(platformRoot, "dist-rendered-capture-worker");
const distPackageJsonPath = path.resolve(distRoot, "package.json");

function pruneNonRuntimeArtifacts(dirAbs) {
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const entryPath = path.resolve(dirAbs, entry.name);
    if (entry.isDirectory()) {
      pruneNonRuntimeArtifacts(entryPath);
      continue;
    }
    if (entry.name.endsWith(".d.ts") || entry.name.endsWith(".tsbuildinfo")) {
      fs.unlinkSync(entryPath);
    }
  }
}

fs.mkdirSync(distRoot, { recursive: true });
pruneNonRuntimeArtifacts(distRoot);
fs.writeFileSync(distPackageJsonPath, `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`, "utf8");
