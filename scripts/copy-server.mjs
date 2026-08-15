import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SERVER_DIR = path.join(ROOT, "server");
const DIST_DIR = path.join(ROOT, "dist");

async function assertBuildExists() {
  try {
    await stat(path.join(DIST_DIR, "index.html"));
  } catch {
    throw new Error("Missing Vite build in dist.");
  }
}

async function main() {
  await assertBuildExists();
  await mkdir(DIST_DIR, { recursive: true });
  await cp(SERVER_DIR, DIST_DIR, { recursive: true });
  console.log("server files copied into dist");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
