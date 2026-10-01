# 03 — Hosting options for the DDTank rewrite ($0 start)

Researched 2026-10-01 against official pricing/docs pages (sources at bottom). Free tiers change often: Oracle cut its A1 allowance in half in mid-2026, and Hetzner raised prices twice in 2026. Check again before you commit.

## What we need to host

| Component | Shape of workload | Hard requirement |
|---|---|---|
| Game server(s) (Node/TS) | Long-lived stateful connections, in-memory rooms/battles | **Persistent process, no idle spin-down.** Raw TCP for Flash projector clients, WebSocket for Ruffle clients |
| HTTP API (replaces `.ashx` XML handlers) | Short request/response | Can be serverless. Simplest to co-locate with the game server |
| React site + admin | Static SPA | Any static host |
| Postgres | Small OLTP | Neon (intended) |
| Game resources (SWF/images, 1–5 GB) | Static, cacheable, read-heavy | Cheap or free egress, large file count |

Key point: **only a real VM, or a home PC behind a tunnel, gives you raw TCP plus an always-on process for $0.** Every PaaS free tier either sleeps, offers only HTTP/WebSocket, or both.

---

## 1. Compute providers

| Provider | Free CPU/RAM | Sleeps when idle? | Bandwidth | Raw TCP | WebSocket | Persistent process | Regions | Card required |
|---|---|---|---|---|---|---|---|---|
| **Oracle Cloud Always Free (Ampere A1)** | **2 OCPU + 12 GB RAM** total (1,500 OCPU-h + 9,000 GB-h/mo; halved from 4/24 in June 2026), split across 1–2 VMs. Plus 2× AMD E2.1.Micro (1/8 OCPU, 1 GB) | No, but Oracle **reclaims idle instances** when 95th-pct CPU, network and (A1) memory all stay under 20% for 7 days | **10 TB/mo** egress | **Yes**, any port (open it in the VCN security list *and* the OS firewall) | Yes | Yes | Home region only (picked at signup, cannot change). A1 capacity is often "Out of host capacity" in busy regions | Yes (verification). Upgrading to PAYG improves A1 capacity odds and stays $0 within limits |
| **Render** free web service | Small shared instance (512 MB class) | **Yes: after 15 min idle, ~1 min cold start** | Included quota; going over can suspend you | No (HTTP only) | Yes, no max duration, but connections drop on deploy/maintenance/spin-down | No | Several | No |
| **Koyeb** free instance | 0.1 vCPU, 512 MB, 2 GB SSD; 1 per org | **Yes: scale-to-zero after 1 h idle, cannot be disabled** | — | TCP Proxy exists (preview) but is **incompatible with scale-to-zero**, so not on free | Yes | No | Frankfurt or Washington DC only | Not stated on pricing page |
| **Fly.io** | **No free tier anymore.** Trial = 2 VM-hours or 7 days, whichever comes first; no dedicated IPv4 | Trial machines auto-stop after 5 min | Paid: $0.02/GB NA/EU | Yes (paid; dedicated IPv4 $2/mo) | Yes | Paid only | Many | **Yes**, required for all orgs |
| **Railway** | Trial: one-time $5 for 30 days. Then **Free plan: $1/mo credit**, max 1 vCPU / 0.5 GB per service, 3 services, 1 project, no custom domain | Optional serverless sleep | Egress $0.05/GB | Yes, TCP Proxy (game servers are an official use case). $1/mo of credit will not run a 24/7 service | Yes | Only while credit lasts | Several | Trial: not stated; verified accounts get full network |
| **Northflank** Developer Sandbox | 2 services + 1 DB + 2 cron jobs; vCPU/RAM caps not published (expect ~0.1–0.2 vCPU / 256–512 MB) | **No: always-on** | Paid egress $0.06/GB | Yes, TCP ports can be exposed | Yes | **Yes** | EU/US managed regions | Pricing page: no card required to start |
| **Google Cloud** free tier | 1× **e2-micro** (0.25–2 vCPU burst, 1 GB) + 30 GB standard PD | No | **Only 1 GB/mo** egress from NA (over that is billed). That is too little for assets | Yes | Yes | Yes | us-west1, us-central1, us-east1 only | Yes ($300/90-day trial) |
| **Azure** free account | 12 months: 750 h/mo of B1s (and B2pts/B2ats Arm/AMD) VMs, then paid. $200 credit for 30 days | No | Some free outbound GB/mo | Yes | Yes | Yes (for 12 months) | Many | Yes |
| **Hetzner** (not free) | CX23 2 vCPU / 4 GB / 40 GB: ~€5.49/mo (after June 2026 increase). CAX11 Arm ~€5.99. Cheap shared plans were often "not available" as of Sep 2026 | No | **20 TB/mo** included | Yes | Yes | Yes | DE, FI (best price); US/SG more expensive | Yes |
| **Cloudflare Workers + Durable Objects** | Workers free: 100k req/day, 10 ms CPU/req. DO free: 100k req/day, 13,000 GB-s/day duration, SQLite storage 5 GB, 5M row reads + 100k row writes/day. Over a limit, those operations fail | DO with WebSocket Hibernation sleeps without dropping clients (you are not billed while it hibernates) | Free egress | **No** (inbound HTTP/WS only) | **Yes**: incoming WS messages billed 20:1 (100 msgs = 5 requests), outgoing free | Per-room DO actor, not a Node process. You would have to re-architect | Global | No |
| **Vercel** (Hobby) | Functions: 2 GB / 1 vCPU, **max duration 300 s** on Hobby (Fluid compute). Monthly: 4 h Active CPU, 360 GB-h memory, 1M invocations, 100 GB Fast Data Transfer | N/A (serverless) | 100 GB/mo | No | **Public beta since Jun 2026**. A connection lives inside a function invocation, so it is **capped at 300 s on Hobby** | No | Single region (iad1 default) | No. **Hobby is non-commercial only** (ads, payments or a paid VIP shop all count as commercial) |
| **Supabase** (free) | 2 active projects; 500 MB DB; Realtime: 200 concurrent connections, 100 msg/s | **Projects pause after 1 week of inactivity** | Egress overage $0.09/GB (Pro) | No | Realtime channels (Broadcast/Presence) only. You cannot run your own server logic | No | Many | No |

### Notes per option

- **Oracle A1** is the only $0 option that meets every game-server requirement: raw TCP ports (Flash XMLSocket and the 843 policy port), WebSocket, a long-lived Node process, 12 GB RAM, and 10 TB egress. Risks:
  - Provisioning can fail on capacity. Pick a less busy home region at signup (Frankfurt and Singapore are reported to provision quickly) or retry with a script.
  - Idle reclamation. Two friends playing occasionally can fall under the 20% thresholds. Converting to PAYG (still $0 within limits) is the commonly cited fix. A cron "keep-busy" job works but is a grey area.
  - The allowance can change without notice, as the June 2026 cut showed. Keep everything in `docker compose` so you can move to Hetzner in 10 minutes.
  - Arm64 (aarch64). Node and Postgres images are fine, but any native npm module needs an arm64 build.
- **Render/Koyeb**: spin-down kills every in-memory battle and room. For a game server they only work for API-only testing. They cannot serve Flash projector clients, which need raw TCP.
- **Northflank** is the best PaaS fallback for a WebSocket-only game server: always-on, no sleep. Tiny CPU/RAM, though, so treat it as a test bed.
- **Durable Objects** fit "one room = one actor" well and are almost free, but they mean rewriting the game server for Workers, not Node, and still no raw TCP. Consider them later, if ever.
- **Vercel**: good for the React site/admin. Not for game sockets: the 300 s cap means a battle socket would be cut mid-match.

---

## 2. Database: Neon free

| Item | Free plan |
|---|---|
| Projects | 100 per org |
| Storage | **1 GB per project** (20 GB account-wide cap) |
| Compute | **100 CU-hours / project / month**, autoscale up to 2 CU (8 GB) |
| Scale to zero | **After 5 min idle; cannot be disabled on Free.** Reactivation in "a few hundred ms" |
| Egress | 5 GB / project / month |
| Branches | 10 per project |
| Connections | Direct `max_connections` ≈ 104 at 0.25 CU (7 reserved). **Pooled endpoint (`-pooler` host, PgBouncer transaction mode): up to 10,000 client connections** |
| Card | No |
| Over limits | Compute is suspended until the next cycle. No data is lost |

Gotchas:
- 100 CU-h at 0.25 CU is about 400 h of active compute a month (~13 h/day). If the game server holds a connection open or polls every few seconds, Neon **never scales to zero** and burns 0.25 CU × 730 h ≈ 182 CU-h, which exceeds the free allowance. **Do not keep idle connections open.** Use short-lived pooled connections, set a pool `idleTimeoutMillis` well under 5 min, and do no heartbeat queries. Keep hot game state in memory and write through or batch-flush to the DB.
- PgBouncer transaction mode means no `LISTEN/NOTIFY`, no session `SET`, no SQL-level `PREPARE`, no temp tables. Run migrations over the direct (non-pooler) URL.
- Cold start (a few hundred ms plus TLS) lands on the first login after idle. That is acceptable, but give the client handshake a generous DB timeout.
- Region: put Neon in the same region as the game VM. Cross-continent latency adds up per query.
- Alternative: run **Postgres in Docker on the Oracle VM** (12 GB RAM is plenty). That gives no compute-hour limit and no cold start, but you own backups (`pg_dump` to R2 nightly). For a game with chatty DB access this is arguably the better $0 choice. Use Neon if you want managed backups and branching.

Supabase as DB: 500 MB and pausing after 1 week idle. Worse than Neon for this project.

---

## 3. Static assets (SWFs, images, 1–5 GB)

| Option | Free limits | Fit |
|---|---|---|
| **Cloudflare R2** | **10 GB-month storage**, 1M Class A (writes) + 10M Class B (reads) ops/month, **egress free**. Free tier is Standard class only. Needs a Cloudflare account; enabling R2 asks for a payment method | **Best.** Serve via a custom domain on the bucket (CDN-cached) and set CORS for Ruffle and `crossdomain.xml` |
| Cloudflare Pages / Workers Static Assets | **20,000 files per site, 25 MiB per file**, 500 builds/mo, bandwidth unmetered | Good for the React site. DDTank resource trees can exceed 20k files, so put assets on R2 |
| GitHub Pages | 1 GB site, **soft 100 GB/mo bandwidth**, 10 builds/h; non-commercial only | Too small for 1–5 GB of assets. OK for docs |
| Oracle VM disk + nginx | 200 GB block storage total, 10 TB egress | A valid fallback: serve assets from the same box (no CDN) |

Gotchas: Flash/Ruffle loads cross-domain resources, so serve `crossdomain.xml` at the asset-domain root and send `Access-Control-Allow-Origin` for Ruffle. Version asset URLs (`?v=` or a path hash) so CDN caching does not serve stale SWFs. R2 Class B ops count every cache miss, but 10M/month is far more than 2–50 players will use.

---

## 4. Tunnels for home hosting

| Tool | Raw TCP for public clients? | WebSocket/HTTP | Free limits | Notes |
|---|---|---|---|---|
| **Cloudflare Tunnel** (`cloudflared`) | **Only if the *client* also runs `cloudflared access tcp`** (documented requirement). Public raw TCP needs Spectrum (paid) | **Yes**, HTTP + WebSocket on public hostnames, free, needs a domain on Cloudflare | Free | Great for the website, API and Ruffle WS. Useless for the Flash projector unless your friend runs cloudflared too |
| **playit.gg** | **Yes, raw TCP + UDP, free** | No HTTPS tunnels on free (Premium only) | Free: ~4 TCP + 4 UDP ports, 2 agents, anycast routing; no published bandwidth cap. Premium $3/mo: 16 ports, regional routing, custom domains, HTTPS | **Best for "my PC + a friend" with Flash TCP.** Ports are assigned (not 843), so the policy-file port must be configurable in the client or served in-band |
| **ngrok** free | TCP endpoints **require card verification** | Yes, with a **browser interstitial page** on free HTTP | 3 endpoints, **1 GB/mo transfer**, 20k HTTP requests, 5k TCP/TLS connections, 1 dev domain | 1 GB per month will not survive SWF downloads. OK for a quick API demo |
| **Tailscale Funnel** | TLS-terminated TCP only, ports **443/8443/10000** only | HTTPS/WSS | All plans, unpublished bandwidth limits, beta | Fine for Ruffle over WSS. Not for plaintext Flash TCP. Alternative: put your friend on your tailnet (plain Tailscale, free), and then raw TCP just works over the 100.x IP |

Simplest friend setup: **Tailscale (not Funnel)**. Your friend installs Tailscale, joins your tailnet, and connects to `100.x.y.z:9200`. That gives raw TCP, any port, the 843 policy port, no bandwidth caps and $0. Use playit.gg when you don't want them installing anything except the game.

---

## 5. RECOMMENDATION — $0 architecture

```
               ┌──────────── Cloudflare (free) ────────────┐
 browser ──►   │ Pages/Workers: React site + admin (SPA)   │
               │ R2 bucket + custom domain: SWFs/images    │  ← assets.example.com (crossdomain.xml, CORS)
               └───────────────────────────────────────────┘
                                │ XHR / WSS
                                ▼
          Oracle Cloud Always Free — A1 VM (2 OCPU / 12 GB, arm64, Ubuntu)
          docker compose:
            caddy        :80/:443  → TLS (Let's Encrypt), reverse proxy
                                      api.example.com  → api:3000   (XML .ashx-compatible HTTP API)
                                      ws.example.com   → game:9300  (WebSocket for Ruffle)
            game         :9200 raw TCP (Flash projector)   + :843 policy server
            api          :3000
            postgres     (optional; or Neon)        + nightly pg_dump → R2
                                │
                                ▼
                   Neon Free (same region) — pooled URL for app, direct URL for migrations
```

- **Website and admin**: **Cloudflare Pages** (or Workers Static Assets). Commercial use is allowed and bandwidth is unmetered. Vercel Hobby also works, but its non-commercial clause conflicts with an eventual VIP shop or donations-for-items. Either way, the admin calls the API on the VM. Do not put admin auth only in the SPA.
- **API and game server**: one Oracle A1 VM running Docker Compose. Open the VCN ingress rules (443, 9200, 843, plus 22 restricted to your IP) **and** `iptables`/`ufw` on the Ubuntu image, which blocks by default. The API can live in the same Node process as the game server at first: same TS codebase, shared DB layer.
- **DB**: Neon pooled endpoint with idle connections closed fast. Or, if the DB access pattern turns out chatty, local Postgres in compose with backups to R2.
- **Assets**: R2 with a custom domain. Upload with `rclone`/`wrangler r2 object put`. 5 GB is within the 10 GB free tier.
- **DNS/TLS**: Cloudflare DNS. Set the WS hostname to proxied (orange cloud): Cloudflare proxies WebSockets on free. The raw-TCP hostname **must be DNS-only (grey cloud)** because Cloudflare will not proxy arbitrary TCP for free.
- **Fallbacks**: if Oracle capacity or reclamation becomes a problem, use **Hetzner CX23 (~€5.49/mo)** with the identical compose file. For WebSocket-only and $0, **Northflank sandbox** (always-on) can host the game service, at the cost of losing Flash projector TCP.

### Option B — one-command local dev

`docker compose up` (or `pnpm dev` via turborepo/concurrently) with:
- `postgres:17` (local, so dev does not burn Neon CU-hours), `api`, `game` (tsx watch), `web` (Vite), and `minio` or a plain nginx `assets` container serving `./resources` with `crossdomain.xml`.
- `.env.local` points everything to `localhost`. A seed script imports the legacy SQL Server data dump.
- The Flash projector client connects to `127.0.0.1:9200`. Ruffle opens `http://localhost:5173`.

### Option C — "run on my PC, friend joins"

1. Same `docker compose up` as Option B, on your PC.
2. Expose:
   - **Tailscale** (friend joins your tailnet). Everything works: raw TCP 9200 + 843, HTTP API, assets. Zero config beyond install. **Recommended.**
   - Or **playit.gg** free: one TCP tunnel for the game port, another for the policy port (client config must accept non-standard ports), plus **Cloudflare Tunnel** for website/API/assets/WSS over a real hostname.
3. Point the client config (`config.xml` / flashvars: API URL, socket host:port, resource URL) to the tunnel addresses. Keep these values server-generated rather than hardcoded in the SWF.

Limits: your PC must be on, and your upload speed caps first-time asset downloads. Pre-share the resource pack, or point resources at R2 even when the server is local.

---

## 6. Gotchas checklist

- **Spin-down kills game sessions.** Render (15 min), Koyeb (1 h, cannot be disabled), Fly trial (5 min), Railway serverless and Supabase pausing all destroy in-memory rooms, battles and guild-war state. None are acceptable for the game server.
- **Serverless WebSockets have time caps.** Vercel Hobby cuts at 300 s. A DDTank match plus lobby time exceeds that.
- **Raw TCP is rare.** Only VMs (Oracle, GCP, Azure, Hetzner), Fly/Railway/Northflank (paid or limited), playit.gg or Tailscale give it. Plan for **WebSocket first** (Ruffle) and treat the TCP gateway as a thin adapter over the same packet handler. Both transports carry the same DDTank binary packets.
- **Flash socket policy.** Flash needs the policy file on port 843 (or in-band on the game port). Tunnels with assigned ports break 843, so support in-band policy responses on the game port.
- **Neon cold start and compute hours.** About 300–500 ms on the first query after 5 min idle. Idle connections held open prevent suspend and exhaust 100 CU-h. Use the pooler URL, short idle timeouts and no polling.
- **Egress.** GCP free gives only 1 GB/mo. Neon 5 GB/project. ngrok 1 GB. Fly $0.02/GB. Railway $0.05/GB. Keep assets on R2 (free egress) or Oracle (10 TB).
- **Oracle**: capacity errors, idle reclamation (7-day < 20% rule), home-region lock, quiet allowance changes, arm64 images, and a double firewall (VCN plus OS iptables).
- **Commercial clauses.** Vercel Hobby and GitHub Pages forbid commercial use. Cloudflare Pages, R2 and Oracle do not. Private-server IP/legal risk is separate: none of these free hosts will tolerate a DMCA complaint, so keep an exportable setup.
- **Cards.** Oracle, GCP, Azure, Fly and Hetzner require a card. Neon, Render, Koyeb, Vercel, Supabase and Northflank (per its docs) don't. R2 asks for a payment method on activation, even on the free tier.

---

## Sources

- Oracle Always Free: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm ; A1 cut coverage: https://daily.dev/posts/oracle-quietly-halves-free-tier-ampere-a1-compute-limits-with-no-public-announcement-ldgjrd9vs , https://www.itechguides.com/oracle-cloud-giving-away-ampere-arm-a1-instances-always-free-the-2026-limits-explained/
- Render: https://render.com/docs/free , https://render.com/docs/websocket
- Koyeb: https://www.koyeb.com/docs/reference/instances , https://www.koyeb.com/docs/run-and-scale/tcp-proxy , https://www.koyeb.com/pricing
- Fly.io: https://docs.fly.io/about/pricing/ , https://docs.fly.io/about/free-trial/
- Railway: https://railway.com/pricing , https://docs.railway.com/reference/pricing/free-trial , https://docs.railway.com/reference/tcp-proxy
- Northflank: https://northflank.com/pricing
- Google Cloud: https://docs.cloud.google.com/free/docs/free-cloud-features
- Azure: https://azure.microsoft.com/en-us/pricing/free-services , https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account
- Hetzner: https://www.hetzner.com/cloud/cost-optimized ; 2026 price changes: https://northflank.com/blog/hetzner-cloud-server-price-increases , https://comparedge.com/tools/hetzner/pricing
- Cloudflare DO: https://developers.cloudflare.com/durable-objects/platform/pricing/ ; R2: https://developers.cloudflare.com/r2/pricing/ ; Pages: https://developers.cloudflare.com/pages/platform/limits/ ; Tunnel TCP client requirement: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/
- Vercel: https://vercel.com/docs/functions/limitations , https://vercel.com/docs/limits/fair-use-guidelines , https://vercel.com/changelog/websocket-support-is-now-in-public-beta
- Supabase: https://supabase.com/pricing , https://supabase.com/docs/guides/realtime/limits
- Neon: https://neon.com/pricing , https://neon.com/docs/connect/connection-pooling , https://neon.com/docs/introduction/scale-to-zero
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- playit.gg: https://playit.gg/ ; free-plan details: https://portwarp.com/compare/playit-gg-vs-portwarp , https://space-node.net/blog/playit-gg-free-minecraft-server-guide-2026
- ngrok: https://ngrok.com/pricing
- Tailscale Funnel: https://tailscale.com/kb/1223/funnel
