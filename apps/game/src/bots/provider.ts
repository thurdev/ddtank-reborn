/**
 * BotProvider backed by app."Bots" (names/levels/weapons editable in the admin). Used for the auto-match fallback:
 * a Match room left alone in the queue for BOT_FALLBACK_SEC is paired with bots (original: RobotGamePlayer /
 * "VirtualPlayer" seats filled by the battle server when no opponent was found).
 */
import { app, type Database } from "@ddt/db";
import { VirtualPlayer, type BotProvider, type BotSpec } from "./bot.js";

export interface DbBotSpec extends BotSpec {
  difficulty: string;
}

/** Used when the table is empty (fresh DB): the server still has opponents. */
const FALLBACK: DbBotSpec[] = [
  { id: 1, nickname: "Robo", sex: true, level: 5, weaponTemplateId: 7001, difficulty: "easy" },
  { id: 2, nickname: "Lina", sex: false, level: 10, weaponTemplateId: 7001, difficulty: "normal" },
  { id: 3, nickname: "Tank-X", sex: true, level: 20, weaponTemplateId: 7001, difficulty: "normal" },
  { id: 4, nickname: "Mira", sex: false, level: 30, weaponTemplateId: 7001, difficulty: "hard" },
];

export const DIFFICULTY: Record<string, number> = { easy: 25, normal: 50, hard: 80, expert: 95 };

export class DbBotProvider implements BotProvider {
  private specs: DbBotSpec[] = FALLBACK;
  private readonly busy = new Set<number>();

  async load(db: Database): Promise<this> {
    const rows = await db.select().from(app.Bots);
    const list = rows
      .filter((r) => r.enabled)
      .map((r) => ({ id: r.id, nickname: r.nickname, sex: r.sex !== "f", level: r.level, weaponTemplateId: r.weaponTemplateId, difficulty: r.difficulty }));
    if (list.length) this.specs = list;
    return this;
  }

  setSpecs(specs: DbBotSpec[]): void {
    this.specs = specs.length ? specs : FALLBACK;
  }

  /** Closest level among the free bots; the bot plays at the human's level so damage/HP stay fair. */
  acquire(level: number): VirtualPlayer | null {
    const free = this.specs.filter((s) => !this.busy.has(s.id));
    if (!free.length) return null;
    free.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || Math.random() - 0.5);
    const s = free[0]!;
    this.busy.add(s.id);
    const bot = new VirtualPlayer({ ...s, level: Math.max(1, level) });
    (bot as VirtualPlayer & { difficulty?: number }).difficulty = DIFFICULTY[s.difficulty] ?? 50;
    return bot;
  }

  release(bot: VirtualPlayer): void {
    this.busy.delete(bot.spec.id);
  }
}
