import { http, HttpResponse, delay } from "msw";
import type { AuthResponse, Channel, CharacterSlot, Me, MyCharacters, NewsItem, PublicConfig, RankingRow, RankingType, ServerStatus, User } from "@/lib/api";

// Dev-only fake API (VITE_USE_MOCKS=true). Shapes mirror the contract in src/lib/api.ts.

const users = new Map<string, { user: User; password: string }>([
  ["jogador", { user: { id: 1, username: "jogador", email: "jogador@example.com", role: "player" }, password: "123456" }],
]);
const tokenFor = (u: User) => `mock-${u.username}`;
const userFromAuth = (req: Request): User | null => {
  const h = req.headers.get("Authorization") ?? "";
  const name = h.replace(/^Bearer mock-/, "");
  return users.get(name)?.user ?? null;
};

// task multi-char: per-username slot list, same shape GET/POST /api/me/characters return in production.
// "jogador" starts with one finished character (slot 1) so the existing login mock keeps working; any other
// mock user starts with a reserved-but-not-created slot 1, same as a brand new account.
const MAX_MOCK_CHARACTERS = 3;
const charSlots = new Map<string, CharacterSlot[]>([
  [
    "jogador",
    [
      {
        slot: 1,
        gameUserName: "jogador",
        created: true,
        id: 10,
        nickname: "Canhoneiro",
        level: 34,
        sex: "m",
        guild: "Artilharia BR",
        title: null,
        vip: { type: 1, level: 2 },
        nimbus: 203,
        style: ",,3135|hair35,,5139|cloth39,6119|face18,1109|head8,,,",
        colors: ",,,,,,,,,",
        skin: "",
        equip: [
          { place: 6, categoryId: 7, strengthenLevel: 9, isGold: false, iconRel: "image/arm/mockarm/1/icon.png" },
          { place: 2, categoryId: 3, strengthenLevel: 0, isGold: false, iconRel: "image/equip/m/hair/mockhair/icon_1.png" },
          { place: 4, categoryId: 5, strengthenLevel: 0, isGold: false, iconRel: "image/equip/m/cloth/mockcloth/icon_1.png" },
        ],
      },
    ],
  ],
]);
function slotsFor(u: User): CharacterSlot[] {
  if (!charSlots.has(u.username)) charSlots.set(u.username, [{ slot: 1, gameUserName: u.username, created: false }]);
  return charSlots.get(u.username)!;
}

const NICKS = ["Canhoneiro", "VentoNorte", "Bombardino", "LuaDeFogo", "TiroCerto", "Zeca_Bala", "Pólvora", "ArcoÍris", "Trovão", "Mira9000"];
const GUILDS = ["Artilharia BR", "Os Pombos", null, "Ventania", "Clube do Ângulo"];

export const handlers = [
  http.get("/api/public/config", ({ request }) => {
    const u = userFromAuth(request);
    // task multi-char: ?slot= picks which character's gameUserName goes into flashvars.user, same as
    // apps/api/src/routes/auth.ts playConfig — slot 1 (default) keeps the account's own username.
    const slot = Number(new URL(request.url).searchParams.get("slot") ?? "1");
    const picked = u && slotsFor(u).find((s) => s.slot === slot);
    const mockUser = picked ? picked.gameUserName : u?.username ?? "";
    const body: PublicConfig = {
      serverName: "DDTank Reborn · S1",
      launcherUrl: "/downloads/DDTankLauncher-Setup.exe",
      game: {
        rufflePath: "/ruffle/ruffle.js",
        swfUrl: "/client/Loading.swf",
        flashvars: { user: mockUser, key: "mock-session-key", config: "/client/config.xml" },
        socketProxy: [{ host: "127.0.0.1", port: 9200, proxyUrl: "ws://localhost:8080/ws/game" }],
        resourceUrl: "/resource/",
      },
    };
    return HttpResponse.json(body);
  }),

  http.get("/api/public/channels", async () => {
    await delay(200);
    const body: Channel[] = [
      { id: 1, name: "Canal 1", state: 2, online: 128, capacity: 1000, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: true, wsUrl: "ws://localhost:8080/ws/game" },
      { id: 2, name: "Canal 2", state: 4, online: 612, capacity: 700, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: false, wsUrl: "ws://localhost:8080/ws/game2" },
      { id: 3, name: "Canal PvP", state: 2, online: 41, capacity: 300, mustLevel: 0, lowestLevel: 20, pvpOnly: true, newerServer: false, wsUrl: "ws://localhost:8080/ws/game3" },
      { id: 4, name: "Canal em manutenção", state: 1, online: 0, capacity: 1000, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: false, wsUrl: "ws://localhost:8080/ws/game4" },
    ];
    return HttpResponse.json(body);
  }),

  http.get("/api/public/status", async () => {
    await delay(250);
    const body: ServerStatus = {
      online: true,
      maintenance: false,
      players: 312 + Math.floor(Math.random() * 20),
      capacity: 1000,
      rooms: 47,
      version: "4.1.0",
      motd: "Fim de semana com EXP em dobro!",
    };
    return HttpResponse.json(body);
  }),

  http.get("/api/public/news", async () => {
    await delay(300);
    const body: NewsItem[] = [
      {
        id: 3,
        title: "Evento: Semana do Vento Forte",
        summary: "Partidas com vento acima de 3 rendem baú extra. Até domingo.",
        category: "event",
        publishedAt: "2026-09-28T12:00:00Z",
      },
      {
        id: 2,
        title: "Nova masmorra: Ninho dos Formigões",
        summary: "Masmorra para 4 jogadores a partir do nível 20, com chefes no modo Herói.",
        category: "update",
        publishedAt: "2026-09-20T15:00:00Z",
      },
      {
        id: 1,
        title: "Manutenção programada",
        summary: "Quinta-feira das 04h às 06h para atualização do servidor de batalha.",
        category: "maintenance",
        publishedAt: "2026-09-15T09:00:00Z",
      },
    ];
    return HttpResponse.json(body);
  }),

  http.get("/api/public/ranking", async ({ request }) => {
    await delay(200);
    const type = (new URL(request.url).searchParams.get("type") ?? "level") as RankingType;
    const mult = { level: 1, gp: 4100, offer: 37, fight: 520 }[type] ?? 1;
    const body: RankingRow[] = Array.from({ length: 20 }, (_, i) => {
      const level = 60 - Math.floor(i * 1.7);
      return {
        rank: i + 1,
        nickname: `${NICKS[i % NICKS.length]}${i >= NICKS.length ? i : ""}`,
        guild: GUILDS[i % GUILDS.length] ?? null,
        level,
        value: type === "level" ? level : Math.round((2000 - i * 73) * mult),
      };
    });
    return HttpResponse.json(body);
  }),

  http.post("/api/auth/login", async ({ request }) => {
    await delay(300);
    const { username, password } = (await request.json()) as { username: string; password: string };
    const rec = users.get(username);
    if (!rec || rec.password !== password) return HttpResponse.json({ message: "Credenciais inválidas" }, { status: 401 });
    return HttpResponse.json<AuthResponse>({ token: tokenFor(rec.user), user: rec.user });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    await delay(300);
    const { username, email, password } = (await request.json()) as { username: string; email: string; password: string };
    if (users.has(username)) return HttpResponse.json({ message: "Este usuário já existe" }, { status: 409 });
    const user: User = { id: users.size + 1, username, email, role: "player" };
    users.set(username, { user, password });
    return HttpResponse.json<AuthResponse>({ token: tokenFor(user), user }, { status: 201 });
  }),

  http.get("/api/account/me", ({ request }) => {
    const u = userFromAuth(request);
    if (!u) return HttpResponse.json({ message: "Não autenticado" }, { status: 401 });
    const body: Me = {
      user: u,
      characters:
        u.username === "jogador"
          ? [{ id: 10, nickname: "Canhoneiro", level: 34, gold: 152_300, money: 4_800, sex: "m", guild: "Artilharia BR" }]
          : [],
    };
    return HttpResponse.json(body);
  }),

  http.get("/api/me/characters", ({ request }) => {
    const u = userFromAuth(request);
    if (!u) return HttpResponse.json({ message: "Não autenticado" }, { status: 401 });
    const slots = slotsFor(u);
    const body: MyCharacters = { characters: slots, maxCharacters: MAX_MOCK_CHARACTERS, canCreate: slots.length < MAX_MOCK_CHARACTERS };
    return HttpResponse.json(body);
  }),

  http.post("/api/me/characters", ({ request }) => {
    const u = userFromAuth(request);
    if (!u) return HttpResponse.json({ message: "Não autenticado" }, { status: 401 });
    const slots = slotsFor(u);
    if (slots.length >= MAX_MOCK_CHARACTERS) return HttpResponse.json({ message: "Limite de personagens atingido." }, { status: 409 });
    const slot = slots.length + 1;
    const created: CharacterSlot = { slot, gameUserName: `${u.username}~${slot}`, created: false };
    slots.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post("/api/account/password", async ({ request }) => {
    const u = userFromAuth(request);
    if (!u) return HttpResponse.json({ message: "Não autenticado" }, { status: 401 });
    const { currentPassword, newPassword } = (await request.json()) as { currentPassword: string; newPassword: string };
    const rec = users.get(u.username)!;
    if (rec.password !== currentPassword) return HttpResponse.json({ message: "Senha atual incorreta" }, { status: 400 });
    rec.password = newPassword;
    return new HttpResponse(null, { status: 204 });
  }),
];
