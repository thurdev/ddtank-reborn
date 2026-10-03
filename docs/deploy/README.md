# Deploy em produção (PT-BR)

Guia passo a passo para colocar o DDTank Reborn no ar numa VM gratuita (Oracle Cloud Always Free, arm64),
do zero até o jogo acessível por um domínio (ou só pelo IP). Veja também:

- `research/03-hosting.md` — comparação completa de provedores e por quê a Oracle A1 foi escolhida.
- `docs/deploy/tailscale.md` — caminho rápido "jogar com um amigo hoje à noite", sem VPS.
- Este arquivo assume que você **não tem acesso de console na nuvem** disponível para o agente — todos
  os passos abaixo são para você rodar manualmente; os scripts fazem o resto.

## 0. Visão geral da stack

```
Cloudflare DNS (grátis) ──► Oracle A1 VM (2 OCPU / 12 GB, arm64, Ubuntu 24.04)
                              docker compose:
                                caddy     :80/:443  (+ :8081 admin, modo IP-only)  HTTPS automático
                                api       interno :8080   (api/, request/, flash/, resource/, uploads/)
                                game      :9200 TCP, :843 policy, :9300 WS (só via Caddy /ws)
                                postgres  interno :5432  (ou troque por Neon — ver §6)
```

Todos os arquivos já existem no repo: `docker-compose.yml`, `apps/api/Dockerfile`, `apps/game/Dockerfile`,
`docker/caddy/`, `docker/assets/`, `scripts/gen-secrets.mjs`, `scripts/deploy/*.sh`. Você só precisa
criar a VM, apontar DNS, subir os arquivos e rodar os comandos abaixo.

## 1. Criar a conta e a VM na Oracle Cloud (Always Free)

1. Crie a conta em https://signup.oraclecloud.com — cartão é pedido só para verificação, o tier Always
   Free não cobra enquanto você ficar dentro dos limites (ver `research/03-hosting.md` §1).
2. Escolha a **home region** com cuidado: não é possível trocar depois, e algumas regiões têm pouca
   capacidade A1 disponível (Frankfurt e Singapore costumam provisionar mais rápido).
3. **Criar instância**: Compute > Instances > Create Instance.
   - **Image**: Canonical Ubuntu 24.04 (aarch64/Arm).
   - **Shape**: clique em "Change shape" > Ampere > `VM.Standard.A1.Flex` > **2 OCPU, 12 GB RAM** (o
     total grátis da conta — não dá para somar com outra VM A1 se usar tudo aqui).
   - **Networking**: crie uma VCN nova (padrão está bom) com IP público.
   - **SSH key**: cole sua chave pública (`ssh-keygen` se não tiver uma) — sem ela não tem como entrar.
   - Se der "Out of host capacity": troque o Availability Domain, ou tente de novo em alguns minutos
     (é comum; não é erro de configuração).
4. Anote o **IP público** da instância.

### Security List (console da Oracle — separado do firewall do próprio Ubuntu)

Networking > Virtual Cloud Networks > `<sua VCN>` > Security Lists > Default Security List >
**Add Ingress Rules**. Adicione uma regra TCP para cada porta (Source CIDR `0.0.0.0/0`, ou seu IP `/32`
para a 22):

| Porta | Uso |
|---|---|
| 22 | SSH |
| 80 | HTTP (redirect + ACME) |
| 443 | HTTPS (site, admin se usar domínio, WS) |
| 9200 | TCP do jogo (cliente Flash projector) |
| 843 | policy file do Flash |
| 8081 | admin, só se for usar IP sem domínio (pule se `ADMIN_ADDRESS` for um domínio na 443) |

Isso é **além** do firewall do Ubuntu (`ufw`) — `scripts/deploy/oracle-setup.sh` configura o `ufw`, mas
a Security List tem que ser aberta aqui manualmente, senão nada chega na VM mesmo com `ufw` liberado.

## 2. Preparar a VM

```bash
ssh ubuntu@<ip-da-vm>
git clone <seu-fork-do-repo> ~/ddtank
cd ~/ddtank
bash scripts/deploy/oracle-setup.sh
```

Isso instala Docker + compose, abre o `ufw` nas portas da tabela acima, e registra um serviço systemd
(`ddtank.service`) para subir a stack automaticamente no boot. Saia e entre de novo no SSH (ou
`newgrp docker`) depois, para o seu usuário poder rodar `docker` sem `sudo`.

## 3. Subir os assets (vendor/)

`vendor/` tem ~3 GB e é gitignored — nunca vai para a imagem Docker nem para o git. Do seu PC:

```bash
rsync -avz --progress vendor/_assets/merged/ ubuntu@<ip-da-vm>:~/ddtank/vendor/_assets/merged/
rsync -avz --progress "vendor/DDTank41/Source Flash/FlashSV1/" ubuntu@<ip-da-vm>:~/ddtank/vendor/DDTank41/"Source Flash"/FlashSV1/
```

(detalhes e a alternativa via R2/rclone estão no cabeçalho de `scripts/deploy/assets.sh`). Depois, na VM:

```bash
bash scripts/deploy/assets.sh     # roda fix-maps.ts + gen-craters.ts dentro de um container descartável
```

## 4. Gerar segredos e configurar domínio/IP

Na VM, dentro de `~/ddtank`:

```bash
node scripts/gen-secrets.mjs
```

Isso cria `.env`, `apps/api/.env`, `apps/game/.env` (a partir dos `.env.example`) e preenche
`JWT_SECRET`, um par RSA **novo** (nunca o da vendor — `RSA_USE_VENDOR_KEY=false` nos dois `.env`),
o cliente já re-assinado com esse par (`apps/api/assets/flash/2.png`), o token interno
admin↔api compartilhado, e `DATABASE_URL` com a senha do Postgres gerada. Veja o resumo que o script
imprime no final: ele lista exatamente o que ainda falta editar manualmente.

Edite à mão (o que depende do seu domínio/IP, o script não pode adivinhar):

- **Com domínio** (ex. `example.com`, já apontado no Cloudflare — ver §5):
  - `.env`: `SITE_ADDRESS=example.com`, `ADMIN_ADDRESS=admin.example.com`, `ACME_EMAIL=seu@email.com`
  - `apps/api/.env`: `PUBLIC_URL=https://example.com`, `SITE_URL=https://example.com`
  - `apps/game/.env`: `PUBLIC_HOST=example.com`, `WS_PUBLIC_URL=wss://example.com/ws`,
    `WS_ALLOWED_ORIGINS=https://example.com`
- **Só com IP** (sem domínio):
  - `.env`: deixe `SITE_ADDRESS` e `ADMIN_ADDRESS` em branco (Caddy usa `:80`/`:8081` sem HTTPS automático)
  - `apps/api/.env`: `PUBLIC_URL=http://<ip-da-vm>`, `SITE_URL=http://<ip-da-vm>`
  - `apps/game/.env`: `PUBLIC_HOST=<ip-da-vm>`, `WS_PUBLIC_URL=ws://<ip-da-vm>/ws`,
    `WS_ALLOWED_ORIGINS=http://<ip-da-vm>`

`GAME_PORT`/`POLICY_PORT` não precisam mudar (9200/843) a não ser que você esteja atrás de um túnel que
reatribui portas (playit.gg — ver `docs/deploy/tailscale.md`).

## 5. DNS (Cloudflare, se for usar domínio)

1. Adicione o domínio ao Cloudflare (grátis) e troque os nameservers no registrador.
2. Crie os registros A (ou AAAA) apontando para o IP da VM:
   - `example.com` → IP da VM, **proxied (nuvem laranja)**. O WebSocket (`/ws`) passa por HTTP(S)
     normal, e o Cloudflare proxia WebSocket de graça no plano free.
   - `admin.example.com` → mesmo IP, proxied também, se usar domínio para o admin.
   - Um hostname **separado só para o socket TCP puro do jogo**, se quiser esconder o IP real — ex.
     `game.example.com` → IP da VM, **DNS-only (nuvem cinza)**. O Cloudflare **não** proxia TCP
     arbitrário no free; um hostname proxied aqui simplesmente não vai funcionar para a porta 9200.
     Se não precisar escondido, o cliente pode conectar direto no IP (configure `apps/game/.env`
     `PUBLIC_HOST` com esse hostname DNS-only, ou com o IP mesmo).
3. Aguarde a propagação (minutos, geralmente) e confirme com `dig example.com`.

## 6. Banco de dados: Postgres local (padrão) ou Neon

O `docker-compose.yml` já sobe um `postgres:17` local (volume `pg_data`, UTF8, `timezone=UTC`) — é o
caminho recomendado por `research/03-hosting.md` §2 para evitar os limites de CU-hora do Neon free.
Para usar o Neon em vez disso (ex.: se quiser backups geridos e branching):

1. Crie um projeto em https://neon.tech, mesma região do servidor.
2. Copie a **pooled connection string** (`-pooler` no host).
3. Em `apps/api/.env` e `apps/game/.env`: `DATABASE_URL=postgres://...-pooler.../neondb?sslmode=require`.
4. Remova/pare o serviço `postgres` do compose (`docker compose stop postgres`) — não é obrigatório
   removê-lo do arquivo, só não usá-lo.
5. Migrações (`db:migrate`) devem rodar contra a URL **direta** (sem `-pooler`), não a pooled —
   PgBouncer em modo transaction não suporta `PREPARE`/`LISTEN` que o `drizzle-kit` pode usar.

## 7. Subir a stack

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f api game caddy
```

Teste: `curl -I http://<ip-ou-domínio>/api/public/launcher` deve responder 200. O jogo em si (Ruffle)
abre em `https://example.com/` (ou `http://<ip>/`), o admin em `https://admin.example.com/` (ou
`http://<ip>:8081/`).

## 8. Backups

```bash
# instala um cron diário (03:00) que faz pg_dump para ~/ddtank-backups, com rotação de 14 dias
( crontab -l 2>/dev/null; echo "0 3 * * * cd $HOME/ddtank && docker compose exec -T postgres pg_dump -U \$(grep ^POSTGRES_USER .env | cut -d= -f2) \$(grep ^POSTGRES_DB .env | cut -d= -f2) | gzip > $HOME/ddtank-backups/\$(date +%Y%m%d).sql.gz && find $HOME/ddtank-backups -mtime +14 -delete" ) | crontab -
mkdir -p ~/ddtank-backups
```

Backup opcional para fora da VM (R2, grátis até 10 GB — ver `research/03-hosting.md` §3):

```bash
# rclone configurado com um remote "r2" apontando pro bucket (rclone config, tipo "s3", provider "Cloudflare")
rclone sync ~/ddtank-backups r2:ddtank-backups
```

Restaurar: `gunzip -c 20261003.sql.gz | docker compose exec -T postgres psql -U <user> <db>`.

## 9. Monitoramento e logs

```bash
docker compose ps                        # status de cada serviço, healthcheck do postgres
docker compose logs -f api                # logs em tempo real (Ctrl+C para sair)
docker compose logs --since 1h game
docker stats                              # CPU/RAM por container (útil pra ficar de olho no limite da A1)
curl -s http://localhost:8080/api/public/launcher | jq .   # dentro da VM, sem passar pelo Caddy
```

O Oracle A1 é **reclamado** se CPU/rede/memória ficarem abaixo de 20% por 7 dias seguidos (ver
`research/03-hosting.md` §1) — um servidor com uso esporádico de verdade pode ser reclamado. Monitore
`docker stats` de vez em quando, e considere converter a conta para "Pay As You Go" (ainda grátis dentro
dos limites) se isso acontecer, que é a correção mais citada.

## 10. Mudar IP, portas ou rates sem reimplantar tudo

- **Rates de XP/ouro/drop**: `apps/game/.env` → `RATE_EXP`, `RATE_GOLD`, `RATE_OFFER`, `RATE_DROP`.
  Também editável **em tempo real pelo admin** (sem reiniciar o container) — painel admin > Servidor >
  Configurações, que chama `apps/api/src/routes/admin.ts` (`applyServerConfig`), repassado por HTTP
  interno ao `apps/game` (canal admin, porta `ADMIN_PORT`/`GAME_INTERNAL_URL`).
- **IP ou domínio novo**: edite `PUBLIC_URL`/`SITE_URL` em `apps/api/.env`, `PUBLIC_HOST`/`WS_PUBLIC_URL`
  em `apps/game/.env`, e `SITE_ADDRESS`/`ADMIN_ADDRESS` em `.env` — depois `docker compose up -d --no-deps
  api game caddy` (não precisa recriar o Postgres).
- **Portas**: `GAME_PORT`/`POLICY_PORT`/`WS_PORT` em `apps/game/.env` + a seção `ports:` do
  `game`/`caddy` em `docker-compose.yml` (e a Security List da Oracle, se mudar a porta pública).
- Depois de qualquer mudança: `bash scripts/deploy/update.sh` faz `git pull` + rebuild + migração +
  restart em um comando.

## 11. Fallback se a Oracle A1 não cooperar

Capacidade indisponível na sua região, ou a instância foi reclamada por ociosidade: o mesmo
`docker-compose.yml` sobe sem alteração num Hetzner CX23 (~€5,49/mês) ou qualquer VM Ubuntu x86_64 — veja
`research/03-hosting.md` §1 e §5. Só troque `vendor/` e `.env`/`apps/*/.env` para o novo host e rode
`scripts/deploy/oracle-setup.sh` mesmo assim (funciona em qualquer Ubuntu, não só Oracle, a parte de
`iptables`/Security List da Oracle é só a seção com esse nome explícito).
