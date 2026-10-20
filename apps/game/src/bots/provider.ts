/**
 * Provedor de bots lido de app."Bots" (nomes/níveis/armas editáveis no admin). Fallback do auto-match:
 * sala Match sozinha na fila por BOT_FALLBACK_SEC ganha bots (RobotGamePlayer/"VirtualPlayer" do original).
 * Só usa linhas com enabled=true; tabela vazia mantém FALLBACK para servidor nunca ficar sem oponente.
 *
 * Como lê esse código (cada variável):
 * - specs: fichas carregadas do banco (ou FALLBACK); busy: ids ocupados no momento.
 * - db: conexão Drizzle; rows/list: linhas brutas/fichas filtradas; r: linha app.Bots.
 * - level: nível do humano (bot joga nesse nível p/ dano/HP justos); free/s: bots livres/candidato.
 * - bot: VirtualPlayer criado; difficulty: mira numérica derivada do texto (DIFFICULTY).
 * - stats: BotStatSource (server.ts passa `ctx.templates`) usado por `view.ts buildBotView()` pra montar
 *   Attack/Defence/Agility/Luck/hp/Style/Colors/Skin reais a partir de weaponTemplateId/equips (m1-bot-pvp).
 */
import { app, type Database } from "@ddt/db";
import { VirtualPlayer, type BotProvider, type BotSpec } from "./bot.js";
import { buildBotView, type BotStatSource } from "./view.js";

/** Ficha do banco: BotSpec + dificuldade textual (easy/normal/hard/expert). */
export interface DbBotSpec extends BotSpec {
  difficulty: string;
}

/** Sem linha no banco (DB novo): servidor continua com oponentes. */
const FALLBACK: DbBotSpec[] = [
  { id: 1, nickname: "Robozao", sex: true, level: 5, weaponTemplateId: 7001, difficulty: "easy", equips: [], guild: null },
  { id: 2, nickname: "LinaFire", sex: false, level: 10, weaponTemplateId: 7001, difficulty: "normal", equips: [], guild: null },
  { id: 3, nickname: "Tamnkench", sex: true, level: 20, weaponTemplateId: 7001, difficulty: "normal", equips: [], guild: null },
  { id: 4, nickname: "Mira mais nub", sex: false, level: 30, weaponTemplateId: 7001, difficulty: "hard", equips: [], guild: null },
];

export const DIFFICULTY: Record<string, number> = { easy: 25, normal: 50, hard: 80, expert: 95 };

export class DbBotProvider implements BotProvider {
  private specs: DbBotSpec[] = FALLBACK;
  private readonly busy = new Set<number>();

  /**
   * m1-bot-pvp: optional `BotStatSource` (server.ts passes `ctx.templates`) to build the bot's real
   * Attack/Defence/Agility/Luck/hp/Style/Colors/Skin from its `weaponTemplateId`/`equips` via `view.ts
   * buildBotView()` — the same `computeStats()` path real players use. Omitted (e.g. older call sites, or
   * tests that don't care about stats) keeps the old placeholder `VirtualPlayer` (Attack/Defence/.../Style
   * all 0/empty), same as before this task.
   */
  constructor(private readonly stats?: BotStatSource) {}

  /** Carrega só bots enabled (equips/guild inclusos); vazio mantém anterior. */
  async load(db: Database): Promise<this> {
    const rows = await db.select().from(app.Bots);
    const list: DbBotSpec[] = rows
      .filter((r) => r.enabled)
      .map((r) => ({ id: r.id, nickname: r.nickname, sex: r.sex !== "f", level: r.level, weaponTemplateId: r.weaponTemplateId, difficulty: r.difficulty, equips: Array.isArray(r.equips) ? [...r.equips] : [], guild: r.guild ?? null }));
    if (list.length) this.specs = list;
    return this;
  }

  /** Recarrega tabela sem restart (admin edita app.Bots e chama sem derrubar servidor). */
  async reload(db: Database): Promise<this> {
    return this.load(db);
  }

  setSpecs(specs: DbBotSpec[]): void {
    this.specs = specs.length ? specs : FALLBACK;
  }

  /** Bot livre de nível mais próximo; joga no nível do humano p/ dano/HP justos. */
  acquire(level: number): VirtualPlayer | null {
    const free = this.specs.filter((s) => !this.busy.has(s.id));
    if (!free.length) return null;
    free.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || Math.random() - 0.5);
    const s = free[0]!;
    this.busy.add(s.id);
    const spec: DbBotSpec = { ...s, level: Math.max(1, level) };
    const bot = new VirtualPlayer(spec, null, 0, "", this.stats && buildBotView(spec, this.stats));
    bot.difficulty = DIFFICULTY[s.difficulty] ?? 50;
    return bot;
  }

  release(bot: VirtualPlayer): void {
    this.busy.delete(bot.spec.id);
  }
}
