#!/usr/bin/env node
/**
 * ch-processo (vários canais, 1 processo `apps/game` por canal): lê `player."Server_List"` e imprime no stdout
 * um compose override (`docker-compose.channels.yml`) com 1 serviço `game-<ID>` por canal HABILITADO que não
 * seja o canal local (`SERVER_ID`/env — o canal local já é o serviço `game` do `docker-compose.yml` base, que
 * esta tarefa NÃO altera). Também grava de volta em `Server_List` (`Port`/`InternalUrl`/`WsUrl`) as portas que
 * escolheu para cada canal novo, pra o dono não precisar calcular nada à mão — rodar de novo é idempotente
 * (canais já configurados manualmente, com `Port`/`InternalUrl`/`WsUrl` preenchidos, não são sobrescritos).
 *
 * Fluxo do dono pra adicionar um canal (ver `docs/GAME-SERVER.md` "Canais" e `docs/deploy/README.md"):
 *   1. Admin → Canais → criar a linha nova (Nome, Estado "Aberto", Enabled=true). Não precisa preencher
 *      Port/InternalUrl/WsUrl — o gerador faz isso.
 *   2. Rodar este gerador (um dos dois comandos abaixo) e revisar o `docker-compose.channels.yml` resultante.
 *   3. `docker compose -f docker-compose.yml -f docker-compose.channels.yml up -d --build`
 *
 * Como rodar (precisa de acesso à mesma Postgres de `apps/api/.env`/`apps/game/.env` — `createDb()` usa
 * `DATABASE_URL` do ambiente, igual todo o resto do stack):
 *
 *   Dev local (sem Docker, PGlite/local Postgres já expostos — útil pra testar o gerador):
 *     pnpm channels:compose > docker-compose.channels.yml
 *
 *   Produção (Postgres do próprio `docker-compose.yml`, só acessível de dentro da rede do compose): roda dentro
 *   do container `api` (que já tem @ddt/db/tsx instalados via `pnpm --filter @ddt/api...` e `DATABASE_URL`
 *   apontando pro serviço `postgres` via `apps/api/.env`):
 *     docker compose run --rm -v "$(pwd)/scripts:/repo/scripts:ro" --entrypoint "" api \
 *       sh -c "pnpm exec tsx /repo/scripts/channels-compose.mjs" > docker-compose.channels.yml
 *
 * Convenção de porta (só aplicada a canais SEM Port/InternalUrl/WsUrl manuais): o N-ésimo canal extra
 * (ordenado por SortOrder,ID, excluindo o local) ganha GAME_PORT 9200+10N, WS_PORT 9300+10N, ADMIN_PORT
 * 9400+10N. `POLICY_ENABLED=false` nos extras — o crossdomain policy (porta 843) é genérico, não depende do
 * canal, então só o canal local precisa responder por ele no host.
 * `WsUrl` gerado aponta pro IP/host público (`CHANNELS_PUBLIC_HOST`/`GAME_HOST`) na porta WS publicada
 * diretamente (sem passar pelo Caddy, diferente do canal local) — ver docs/GAME-SERVER.md "O que falta" pra
 * por que isso é uma limitação conhecida (sem TLS no WS dos canais extras) até uma tarefa de polish/ch-bus.
 */
import { createDb, player } from "@ddt/db";
import { eq } from "drizzle-orm";

const LOCAL_SERVER_ID = Number(process.env.SERVER_ID ?? 4);
const BASE_GAME_PORT = 9200;
const BASE_WS_PORT = 9300;
const BASE_ADMIN_PORT = 9400;
const PORT_STEP = 10;
const PUBLIC_HOST = process.env.CHANNELS_PUBLIC_HOST || process.env.GAME_HOST || "127.0.0.1";

/** Minimal deterministic YAML writer — enough for this file's known shape (strings/numbers/booleans/objects/
 * arrays of strings), no need for a `yaml`/`js-yaml` dependency just for a config generator. */
function toYaml(value, indent = 0) {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]\n`;
    return value.map((v) => `${pad}- ${scalar(v)}\n`).join("");
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return `${pad}{}\n`;
    return keys
      .map((k) => {
        const v = value[k];
        if (v && typeof v === "object" && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
          return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
        }
        if (Array.isArray(v) || (v && typeof v === "object")) return `${pad}${k}: ${Array.isArray(v) ? "[]" : "{}"}\n`;
        return `${pad}${k}: ${scalar(v)}\n`;
      })
      .join("");
  }
  return `${pad}${scalar(value)}\n`;
}
function scalar(v) {
  if (typeof v === "string") return /^[\w./:-]+$/.test(v) ? v : JSON.stringify(v);
  return String(v);
}

async function main() {
  const h = await createDb();
  try {
    const rows = await h.db.select().from(player.Server_List);
    const enabled = rows.filter((r) => r.Enabled);
    enabled.sort((a, b) => a.SortOrder - b.SortOrder || a.ID - b.ID);
    const extra = enabled.filter((r) => r.ID !== LOCAL_SERVER_ID);

    const services = {};
    let idx = 0;
    for (const row of extra) {
      idx++;
      const svc = `game-${row.ID}`;
      const hasManualPort = row.Port != null && row.Port > 0;
      const gamePort = hasManualPort ? row.Port : BASE_GAME_PORT + PORT_STEP * idx;
      const wsPort = BASE_WS_PORT + PORT_STEP * idx;
      const adminPort = BASE_ADMIN_PORT + PORT_STEP * idx;
      const wsUrl = row.WsUrl || `ws://${PUBLIC_HOST}:${wsPort}/ws`;
      const internalUrl = row.InternalUrl || `http://${svc}:${adminPort}`;

      services[svc] = {
        build: { context: ".", dockerfile: "apps/game/Dockerfile" },
        restart: "unless-stopped",
        env_file: "apps/game/.env",
        environment: {
          TZ: "UTC",
          SERVER_ID: String(row.ID),
          GAME_PORT: String(gamePort),
          WS_PORT: String(wsPort),
          WS_PUBLIC_URL: wsUrl,
          ADMIN_PORT: String(adminPort),
          POLICY_ENABLED: "false",
        },
        depends_on: { postgres: { condition: "service_healthy" } },
        ports: [`${gamePort}:${gamePort}`, `${wsPort}:${wsPort}`],
        expose: [String(adminPort)],
      };

      // Idempotente: só grava o que ainda não foi preenchido manualmente (admin ou uma rodada anterior).
      const patch = {};
      if (!hasManualPort) patch.Port = gamePort;
      if (!row.InternalUrl) patch.InternalUrl = internalUrl;
      if (!row.WsUrl) patch.WsUrl = wsUrl;
      if (Object.keys(patch).length) await h.db.update(player.Server_List).set(patch).where(eq(player.Server_List.ID, row.ID));
    }

    if (!extra.length) {
      process.stderr.write(
        `channels-compose: nenhum canal extra habilitado além do local (SERVER_ID=${LOCAL_SERVER_ID}) — nada a gerar. ` +
          `Crie um canal em Admin -> Canais e rode de novo.\n`,
      );
    }
    process.stdout.write(toYaml({ name: "ddtank", services }));
  } finally {
    await h.close();
  }
}

main().catch((e) => {
  console.error("channels-compose:", e);
  process.exit(1);
});
