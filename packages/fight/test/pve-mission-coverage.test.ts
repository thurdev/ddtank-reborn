import { describe, expect, it } from "vitest";
import { scriptInfo } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { missions } from "./pve-data.js";

/**
 * Guards the PvE mission scripts the same way `packages/fight/scripts/pve-smoke.ts` does at runtime (see
 * `research/qa/port-E.md`), but statically and fast: every `Mission_Info.Script` (real seed data,
 * `packages/db/seed/game/Mission_Info.json.gz`) must resolve to a registered script, or PveGame's
 * `createScript()` falls back to `GenericMission` — a mission that spawns nothing on its own and auto-wins the
 * instant nothing is alive (players get a free win with no fight instead of the real encounter).
 *
 * Como lê esse código (cada variável):
 * - `KNOWN_SOURCELESS`: nomes curtos (`Mission_Info.Script` sem o prefixo `GameServerScript.AI.Messions.`) de
 *   missões cujo C# não existe em NENHUM vendor disponível (DDTank41, o doador DDTank4.1, nem a referência
 *   DDT-6600) — confirmado por busca exaustiva (nome de classe E nome de arquivo) nas três árvores. Não é uma
 *   lacuna de porte: é conteúdo que o próprio Mission_Info aponta pra uma classe que nunca existiu no código que
 *   temos (provavelmente nunca foi lançada, ou só existe numa DLL compilada que não foi decompilada). Quando
 *   alguém achar o C# de um desses (ex.: decompilando a DLL), porte e REMOVA o nome daqui — o teste abaixo garante
 *   que a lista nunca "esconde" um gap real: se o nome ainda resolver depois de removido, o teste de baixo falha.
 *
 *   2026-10-11: 64 das 65 missões desta lista (todas exceto `CoupleBoss15002`) foram achadas publicamente em forks
 *   DDTank/Gunny (vendor/_qa-mission-sources/{ddt-34-csharp,gunny-3.0}, ambos clones rasos gitignored) e portadas
 *   via `pnpm transpile-pve` contra uma árvore doadora temporária (donor DDTank4.1 + esses 64 arquivos); os .ts
 *   gerados foram extraídos manualmente pra não sobrescrever as traduções PT-BR já feitas nos ~258 scripts
 *   pré-existentes (o transpiler sempre limpa `generated/` inteiro). Ver research/qa/mission-sources.md.
 */
// 2026-10-11: all 65 previously-sourceless missions are now resolved (64 ported from public DDTank/Gunny forks,
// CoupleBoss15002 hand-designed — see research/qa/mission-sources.md). Empty until a new gap is found.
const KNOWN_SOURCELESS: string[] = [];
const knownSourceless = new Set(KNOWN_SOURCELESS);

describe("PvE mission script coverage (Mission_Info → registered script)", () => {
  it("every mission script either resolves or is a documented sourceless gap", () => {
    expect(missions.size).toBeGreaterThan(0);
    const unexpectedlyMissing: string[] = [];
    for (const m of missions.values()) {
      const short = m.Script.split(".").pop()!;
      if (knownSourceless.has(short)) continue;
      if (!scriptInfo(m.Script)) unexpectedlyMissing.push(`mission ${m.Id}: ${m.Script}`);
    }
    // A failure here means a mission that used to resolve (or never appeared in KNOWN_SOURCELESS) now falls back
    // to GenericMission — either a real regression, or a new Mission_Info row whose script genuinely has no C#
    // anywhere in vendor/** (in which case: verify that with grep across DDTank41 + DDTank4.1 + DDT-6600, then add
    // the short name to KNOWN_SOURCELESS with the same justification as the rest of the list).
    expect(unexpectedlyMissing).toEqual([]);
  });

  it("KNOWN_SOURCELESS stays honest: every listed name is still actually unresolved", () => {
    // If one of these now resolves (because someone ported it, e.g. via vendor/DDT-6600 like
    // `scripts/manual/ancient-castle.ts` did for CrosairBoss/AC30001/AC30002/AC30004), it must be removed from the
    // list above — otherwise this allowlist would silently stop testing the regression it exists to catch.
    const stillResolved: string[] = [];
    for (const short of KNOWN_SOURCELESS) {
      if (scriptInfo(`GameServerScript.AI.Messions.${short}`)) stillResolved.push(short);
    }
    expect(stillResolved).toEqual([]);
  });

  it("the ancient-castle manual port no longer needs its fallback (regression guard)", () => {
    for (const full of [
      "GameServerScript.AI.Messions.CrosairBoss",
      "GameServerScript.AI.Messions.AC30001",
      "GameServerScript.AI.Messions.AC30002",
      "GameServerScript.AI.Messions.AC30004",
    ]) {
      expect(scriptInfo(full)?.kind).toBe("mission");
    }
    expect(scriptInfo("GameServerScript.AI.NPC.SixTerrorSecondNpc")?.kind).toBe("brain");
  });
});
