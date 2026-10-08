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
 */
import { app, type Database } from "@ddt/db";
import { VirtualPlayer, type BotProvider, type BotSpec } from "./bot.js";

/** Ficha do banco: BotSpec + dificuldade textual (easy/normal/hard/expert). */
export interface DbBotSpec extends BotSpec {
  difficulty: string;
}

/** Sem linha no banco (DB novo): servidor continua com oponentes. */
const FALLBACK: DbBotSpec[] = [
  { id: 1, nickname: "Robo", sex: true, level: 5, weaponTemplateId: 7001, difficulty: "easy", equips: [], guild: null },
  { id: 2, nickname: "Lina", sex: false, level: 10, weaponTemplateId: 7001, difficulty: "normal", equips: [], guild: null },
  { id: 3, nickname: "Tank-X", sex: true, level: 20, weaponTemplateId: 7001, difficulty: "normal", equips: [], guild: null },
  { id: 4, nickname: "Mira", sex: false, level: 30, weaponTemplateId: 7001, difficulty: "hard", equips: [], guild: null },
];

export const DIFFICULTY: Record<string, number> = { easy: 25, normal: 50, hard: 80, expert: 95 };

export class DbBotProvider implements BotProvider {
  private specs: DbBotSpec[] = FALLBACK;
  private readonly busy = new Set<number>();

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
    const bot = new VirtualPlayer({ ...s, level: Math.max(1, level) });
    bot.difficulty = DIFFICULTY[s.difficulty] ?? 50;
    return bot;
  }

  release(bot: VirtualPlayer): void {
    this.busy.delete(bot.spec.id);
  }
}
