import type { FieldDef, ResourceDef, Row } from "@/crud/types";
import { resources } from "@/resources";

/** In-memory tables for the dev mock API, one per ResourceDef. */

const DAY = 86_400_000;
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const int = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));

const svgIcon = (hue: number, label: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="hsl(${hue} 70% 55%)"/><text x="32" y="41" font-family="sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#0a0e22">${label}</text></svg>`,
  );

/** Generic row generator from field types — new resources get mock data for free. */
function autoRow(def: ResourceDef, i: number): Row {
  const row: Row = {};
  for (const f of def.fields) row[f.name] = autoValue(f, i, def);
  return row;
}
function autoValue(f: FieldDef, i: number, def: ResourceDef): unknown {
  if (f.name === def.idField && f.type === "number") return i + 1;
  if (f.default !== undefined && rand() < 0.5) return f.default;
  switch (f.type) {
    case "number":
      return int(f.min ?? 0, f.max ?? 1000);
    case "boolean":
      return rand() > 0.3;
    case "select":
      return f.options?.length ? pick(f.options).value : null;
    case "date":
    case "datetime":
      return new Date(Date.now() - int(-10, 60) * DAY).toISOString();
    case "image":
      return svgIcon(int(0, 360), String(i + 1));
    case "tags":
      return [];
    case "json":
      return f.default ?? null;
    case "password":
      return undefined;
    case "color":
      return "#ffc531";
    default:
      return `${typeof f.label === "string" ? f.label : f.label["pt-BR"]} ${i + 1}`;
  }
}

const NICKS = ["Canhoneiro", "VentoNorte", "Bombardino", "LuaDeFogo", "TiroCerto", "Zeca_Bala", "Pólvora", "ArcoÍris", "Trovão", "Mira9000", "Pipoca", "Dona_Granada"];
const ITEM_NAMES: [number, string][] = [
  [7, "Canhão Básico"], [7, "Bazuca do Trovão"], [7, "Lança-Gelo"], [7, "Martelo Cósmico"],
  [1, "Chapéu de Pirata"], [1, "Capacete de Astronauta"], [5, "Jaqueta de Piloto"], [5, "Armadura Dourada"],
  [15, "Asas de Anjo"], [15, "Asas de Morcego"], [11, "Poção de Vida"], [11, "Pedra de Fortalecimento"],
  [10, "Teleporte"], [10, "Tiro Triplo"], [9, "Anel do Vento"], [14, "Colar de Rubi"],
];

function seeds(): Record<string, Row[]> {
  const now = Date.now();
  return {
    players: Array.from({ length: 64 }, (_, i) => ({
      id: 1000 + i,
      nickname: `${NICKS[i % NICKS.length]}${i >= NICKS.length ? i : ""}`,
      username: `conta${i + 1}`,
      online: rand() > 0.6,
      level: int(1, 60),
      gp: int(0, 900_000),
      gold: int(0, 2_000_000),
      money: int(0, 50_000),
      giftToken: int(0, 5_000),
      banned: i % 17 === 5,
      lastLoginAt: new Date(now - int(0, 30) * DAY).toISOString(),
    })),
    items: ITEM_NAMES.map(([cat, name], i) => ({
      templateId: 7000 + i * 10,
      name,
      pic: svgIcon((i * 47) % 360, name.slice(0, 2)),
      categoryId: cat,
      quality: int(1, 5),
      needSex: 0,
      description: "",
      needLevel: int(1, 40),
      level: 1,
      attack: cat === 7 ? int(50, 400) : 0,
      defence: cat === 5 || cat === 1 ? int(20, 200) : 0,
      agility: int(0, 60),
      luck: int(0, 60),
      maxCount: cat === 11 ? 99 : 1,
      suitId: 0,
      canEquip: cat !== 11 && cat !== 10,
      canUse: cat === 11,
      canDrop: true,
      canDelete: true,
      canStrengthen: cat === 7,
      canCompose: cat === 7,
      bindType: 0,
      script: "",
    })),
    bots: ["Robô Rabugento", "Capitão Pólvora", "Sargento Vento", "Dama do Canhão", "Professor Parábola", "Tia Bomba"].map((nickname, i) => ({
      id: i + 1,
      nickname,
      sex: i % 2 ? "f" : "m",
      level: 5 + i * 9,
      difficulty: (["easy", "normal", "hard", "expert"] as const)[i % 4],
      weaponTemplateId: 7000 + (i % 4) * 10,
      equips: ["7040", "7060"],
      guild: i % 3 ? "Liga dos Bots" : "",
      enabled: i !== 4,
    })),
    texts: [
      ["ddt.game.start", "ddt.game", "Começar", "Start"],
      ["ddt.game.ready", "ddt.game", "Pronto", "Ready"],
      ["ddt.game.wind", "ddt.game", "Vento", "Wind"],
      ["ddt.room.create", "ddt.room", "Criar sala", "Create room"],
      ["ddt.room.quickJoin", "ddt.room", "Entrada rápida", "Quick join"],
      ["ddt.shop.buy", "ddt.shop", "Comprar", "Buy"],
      ["ddt.shop.notEnoughMoney", "ddt.shop", "Cupons insuficientes", "Not enough coupons"],
      ["ddt.bag.title", "ddt.bag", "Mochila", "Bag"],
      ["ddt.guild.title", "ddt.guild", "Guilda", "Guild"],
      ["ddt.pve.hero", "ddt.pve", "Herói", "Hero"],
    ].map(([key, group, ptBR, en]) => ({ key, group, ptBR, en })),
    news: [
      { id: 3, title: "Evento: Semana do Vento Forte", category: "event", summary: "Partidas com vento acima de 3 rendem baú extra.", publishedAt: new Date(now - 3 * DAY).toISOString(), published: true },
      { id: 2, title: "Nova masmorra: Ninho dos Formigões", category: "update", summary: "Masmorra para 4 jogadores a partir do nível 20.", publishedAt: new Date(now - 11 * DAY).toISOString(), published: true },
      { id: 1, title: "Manutenção programada", category: "maintenance", summary: "Quinta-feira das 04h às 06h.", publishedAt: new Date(now - 16 * DAY).toISOString(), published: true },
    ].map((n) => ({ cover: "", body: "", ...n })),
    events: [
      { name: "EXP em dobro de fim de semana", type: "exp", multiplier: 2, start: -2, len: 3, color: "#33e0b0" },
      { name: "Chuva de ouro", type: "gold", multiplier: 1.5, start: 5, len: 2, color: "#ffc531" },
      { name: "Torneio da Parábola", type: "tournament", multiplier: 1, start: 12, len: 1, color: "#ff5d6c" },
      { name: "Drop do Formigão", type: "drop", multiplier: 2, start: -12, len: 7, color: "#4fb3ff" },
      { name: "Login diário de outubro", type: "login", multiplier: 1, start: 0, len: 28, color: "#a77bff" },
    ].map((e, i) => ({
      id: i + 1,
      name: e.name,
      type: e.type,
      multiplier: e.multiplier,
      startAt: new Date(now + e.start * DAY).toISOString(),
      endAt: new Date(now + (e.start + e.len) * DAY).toISOString(),
      color: e.color,
      description: "",
      config: {},
      active: i !== 2,
    })),
    dungeons: [
      ["Ninho dos Formigões", 20], ["Castelo do Rei Galo", 30], ["Fortaleza de Gelo", 40], ["Templo Perdido", 50],
    ].map(([name, lvl], i) => ({
      id: 1000 + i,
      name,
      pic: svgIcon(i * 80, String(name).slice(0, 2)),
      mapId: 1100 + i,
      levelLimit: lvl,
      maxPlayers: 4,
      difficulties: ["easy", "normal", "hard", "hero"],
      script: `GameServerScript.AI.Missions.Mission${1000 + i}`,
      ticketTemplateId: 0,
      dailyLimit: 3,
      rewards: { easy: [], normal: [], hard: [], hero: [] },
      active: true,
    })),
    logs: Array.from({ length: 120 }, (_, i) => ({
      id: i + 1,
      at: new Date(now - i * 7 * 60_000).toISOString(),
      level: i % 13 === 0 ? "error" : i % 5 === 0 ? "warn" : "info",
      category: pick(["auth", "shop", "admin", "game", "mail"]),
      actor: pick(["sistema", "admin", ...NICKS]),
      message: pick(["Login efetuado", "Compra na loja", "Configuração alterada", "Sala criada", "Correio enviado", "Falha de conexão TCP"]),
    })),
    "admin-users": [
      { id: 1, username: "admin", email: "admin@example.com", role: "admin", active: true, lastLoginAt: new Date(now).toISOString() },
      { id: 2, username: "gm", email: "gm@example.com", role: "gm", active: true, lastLoginAt: new Date(now - DAY).toISOString() },
    ],
    "mail-broadcasts": [],
  };
}

export const tables = new Map<string, Row[]>();
{
  const s = seeds();
  for (const def of resources) {
    tables.set(def.name, s[def.name] ?? Array.from({ length: 25 }, (_, i) => autoRow(def, i)));
  }
  // Shop rows reference item names.
  const items = tables.get("items")!;
  tables.set(
    "shop",
    items.slice(0, 12).map((it, i) => ({
      id: i + 1,
      templateId: it.templateId,
      itemName: it.name,
      shopType: pick(["weapon", "equip", "beauty", "prop", "special"]),
      currency: i % 3 ? "money" : "gold",
      price: int(1, 50) * 100,
      validDays: pick([0, 7, 30]),
      discount: 0,
      sortOrder: i,
      onSale: i % 5 !== 0,
    })),
  );
}

export const nextId = (rows: Row[], idField: string) =>
  rows.reduce((m, r) => Math.max(m, Number(r[idField]) || 0), 0) + 1;
