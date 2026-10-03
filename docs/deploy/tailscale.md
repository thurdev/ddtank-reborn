# Jogar com um amigo hoje à noite (sem VPS)

Caminho rápido: rode o servidor no seu PC e deixe o amigo entrar direto, sem conta na nuvem. Duas opções —
Tailscale (recomendado, zero configuração de portas) e playit.gg (o amigo não precisa instalar nada além do jogo).

## Opção A — Tailscale (recomendado)

Dá TCP puro em qualquer porta (9200, 843) de graça, sem precisar abrir nada no roteador.

1. **No seu PC:**
   - Instale o Tailscale: https://tailscale.com/download
   - Rode `pnpm dev:all` (ou `docker compose up -d`, se já estiver usando a stack de produção localmente).
   - Veja seu IP do tailnet: `tailscale ip -4` (algo como `100.x.y.z`).
2. **Convide o amigo:** no admin do Tailscale (https://login.tailscale.com/admin/machines), convide o
   e-mail dele para a sua tailnet (ou mande o link de convite). Ele instala o Tailscale e entra na mesma rede.
3. **Aponte o jogo para o seu IP do tailnet** — não para `localhost` nem para o IP da sua LAN:
   - `apps/game/.env`: `PUBLIC_HOST=100.x.y.z`
   - `apps/api/.env`: `GAME_HOST=100.x.y.z`, `PUBLIC_URL=http://100.x.y.z:8080`, `SITE_URL=http://100.x.y.z:5173`
     (ou as portas do `docker compose`, se estiver usando a stack: `PUBLIC_URL=http://100.x.y.z:80`)
   - Reinicie api/game para aplicar.
4. **Launcher do amigo:** `DDT_API_URL=http://100.x.y.z:8080` (ou `:80` com a stack Docker) em
   `launcher.config.json` ao lado do `.exe`, ou variável de ambiente `DDT_API_URL` — ver
   `apps/launcher/README.md` §Configuração.
5. **Web/Ruffle do amigo:** ele abre `http://100.x.y.z:5173` (dev) ou `http://100.x.y.z` (stack Docker)
   no navegador. O IP do tailnet só funciona para quem está na mesma tailnet — não é público.

Isso dá: TCP 9200 (projector Flash), 843 (policy), WebSocket e HTTP, todos através do túnel do Tailscale,
sem limite de banda publicado e sem configurar porta nenhuma no roteador.

## Opção B — playit.gg (o amigo só instala o jogo, nada de VPN)

TCP/UDP público de graça, mas **sem** HTTPS/WSS no plano free — ok para o Flash projector original, não
ideal para o cliente Ruffle (que depende de WSS atrás de um domínio). Use quando não quiser que o amigo
instale o Tailscale.

1. Crie uma conta em https://playit.gg e instale o agente no seu PC (o que vai rodar o servidor).
2. Crie dois túneis TCP no painel do playit.gg:
   - um para a porta do jogo (`GAME_PORT`, padrão 9200)
   - um para a porta de policy do Flash (`POLICY_PORT`, padrão 843)
   O playit.gg atribui um host + porta pública **diferentes** dos originais (ex.: `abc123.playit.gg:41234`).
3. Como as portas públicas não são 9200/843, o cliente precisa saber a porta real:
   - `apps/game/.env`: `PUBLIC_HOST=<host do playit.gg>` — mantenha `GAME_PORT=9200` internamente; é o
     `ServerList.ashx` do `apps/api` que informa ao cliente qual host:porta usar (ele soma 69 à porta
     configurada, ver `apps/api/.env.example` comentário em `GAME_PORT`). Se o playit.gg mudar a porta
     pública, ajuste `GAME_PORT` no `apps/api/.env` para a porta pública **menos 69** antes de reiniciar.
   - Para o socket de policy, o playit.gg não respeita "843" fixo — prefira a política **in-band na
     própria porta do jogo** (já suportada: `POLICY_ENABLED=true` no `apps/game/.env` responde o policy
     file tanto na porta 843 quanto, se o cliente conectar direto, na GAME_PORT) em vez de depender do
     segundo túnel.
4. Para o site/API/WS, use **Cloudflare Tunnel** em paralelo (grátis, HTTP+WS, domínio de verdade) em vez
   de mais túneis playit.gg — playit.gg free não faz HTTPS. Veja `cloudflared tunnel` na documentação
   oficial: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/
5. Launcher/cliente do amigo: aponte `DDT_API_URL` para o hostname do Cloudflare Tunnel, e o socket do
   jogo para o host:porta que o playit.gg deu no passo 2.

**Resumo:** Tailscale = mais simples e tudo funciona igual à LAN (recomendado para "só eu e um amigo
hoje"). playit.gg = o amigo não instala nada extra, mas dá mais configuração manual de portas.
