// Copies the compiled client (vendor/DDTank41/Source Flash/FlashSV1, ~73 MB) into public/game/flash.
// The vendor tree is read-only; we never modify it. Backup files (*.bak) are skipped.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = resolve(root, "../../vendor/DDTank41/Source Flash/FlashSV1");
const dst = join(root, "public/game/flash");

if (!existsSync(src)) {
  console.error(`client source not found: ${src}`);
  process.exit(1);
}
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, {
  recursive: true,
  filter: (p) => !p.endsWith(".bak"),
});
console.log(`copied ${src} -> ${dst}`);
