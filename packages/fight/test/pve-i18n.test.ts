import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Guards against regressions on the i18n-instancias sweep (see docs/I18N-AUDIT.md): everything a player sees
// in dungeons/PvE (DB text overlay + hardcoded NPC/mission chat in packages/fight/src/pve and the PvE-related
// apps/game handlers) must be free of Chinese (Han) and Vietnamese-only diacritics, except the short,
// documented exceptions (dead code / comments) in tools/qa/pve-i18n-scan.mjs.
describe("PvE/dungeon i18n", () => {
  it("has no leftover CJK or Vietnamese-only text (tools/qa/pve-i18n-scan.mjs)", () => {
    const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
    const script = join(repoRoot, "tools", "qa", "pve-i18n-scan.mjs");
    try {
      const out = execFileSync(process.execPath, [script, "--json"], { cwd: repoRoot, encoding: "utf8" });
      const { db, code } = JSON.parse(out);
      expect(db, `DB overlay leftovers: ${JSON.stringify(db, null, 1)}`).toEqual([]);
      expect(code, `Code literal leftovers: ${JSON.stringify(code, null, 1)}`).toEqual([]);
    } catch (e) {
      // execFileSync throws on the script's non-zero exit (findings present) — its stdout still has the JSON.
      const out = e && typeof e === "object" && "stdout" in e ? String(e.stdout) : "";
      throw new Error(`pve-i18n-scan.mjs reported leftovers:\n${out || String(e)}`);
    }
  });
});
