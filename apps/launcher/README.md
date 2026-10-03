# DDTank Launcher (`apps/launcher`)

Launcher desktop (Windows primeiro) do DDTank Reborn. O jogador baixa um `.exe`, entra com usuário e senha, clica em **JOGAR** e o cliente Flash original (DDTank 4.1) abre apontando para o nosso servidor Node. Não precisa instalar Flash, navegador antigo nem plugin.

- **Interface:** Electron 44 + React + TypeScript + Vite, com os componentes de `@ddtank/ui`. Não tem Flash dentro.
- **Jogo:** roda em um processo separado:
  - **Flash Player 32 projector** (padrão; é a máquina virtual Flash real);
  - **Ruffle desktop** (opcional; open source, usa a placa de vídeo, mas ainda depende de patches no cliente).
- O motivo da escolha (e por que **não** usamos Electron 11 + PepperFlash) está em [`research/launcher/01-design.md`](../../research/launcher/01-design.md). Os launchers antigos estão analisados em [`00-existing.md`](../../research/launcher/00-existing.md).

## Comandos

```bash
pnpm --filter launcher build              # tsc (main/preload) + vite (renderer) -> dist/
pnpm --filter launcher test               # vitest
pnpm --filter launcher typecheck
pnpm --filter launcher dev                # Vite + Electron (apontando para http://localhost:8080)
pnpm --filter launcher dev:mock           # igual, mas sobe uma API falsa (scripts/mock-api.mjs) na 8080
pnpm --filter launcher dist:win           # instalador NSIS + .exe portátil em release/ (NÃO publica)
pnpm --filter launcher dist:win:portable  # só o .exe portátil
pnpm --filter launcher fetch-runtime projector   # baixa o runtime p/ embutir no instalador (ver abaixo)
```

Na primeira execução, o binário do Electron é baixado automaticamente: a versão 44 não tem mais postinstall.
Na API falsa, qualquer usuário entra com a senha `123`.

### Build de produção (apontando para o servidor hospedado)

```bash
cp launcher.config.production.example.json launcher.config.json
# edite launcher.config.json: troque example.com pelo seu domínio (ou IP) real, igual ao SITE_ADDRESS do Caddy
pnpm --filter launcher fetch-runtime projector   # opcional: embutir o Flash Player projector no instalador
pnpm --filter launcher dist:win                  # gera release/*.exe (NSIS + portátil) já com esse config embutido
```

`launcher.config.production.example.json` (na raiz de `apps/launcher/`) é o ponto de partida: `apiUrl`
aponta para o domínio do `docker-compose.yml` (`SITE_ADDRESS` do Caddy — ver `docs/deploy/README.md`), e
`manifestUrl`/`loginUrl`/`swfUrl` são derivados dele automaticamente (ver "Configuração" abaixo). Gere um
build por ambiente se tiver mais de um servidor (ex.: um `launcher.config.json` para produção, outro para
o servidor de testes do Tailscale em `docs/deploy/tailscale.md`).

## Configuração (todas as URLs são configuráveis)

A configuração é lida em camadas. Quando a mesma chave aparece em mais de uma camada, vale a última:

1. Padrões de desenvolvimento: `http://localhost:8080`.
2. `resources/launcher.config.json`, embutido no instalador. Para gerar: copie `launcher.config.example.json` para `launcher.config.json` antes do `dist:win`.
3. `launcher.config.json` ao lado do `.exe` (útil no portátil).
4. `%APPDATA%/DDTank Launcher/launcher.config.json` (ajuste por máquina).
5. Variáveis de ambiente `DDT_*` (veja `.env.example`):
   - `DDT_API_URL`, `DDT_MANIFEST_URL`, `DDT_LOGIN_URL`, `DDT_UPDATE_URL`;
   - `DDT_SWF_URL`, `DDT_CONFIG_XML_URL`;
   - `DDT_PROJECTOR_PATH`, `DDT_RUFFLE_PATH`.

Se um arquivo estiver inválido, só ele é ignorado; os outros continuam valendo. A aba **Logs** mostra quais arquivos foram usados.

Se você só definir `apiUrl`, o resto é derivado dele:
- `manifestUrl` = `{api}/api/public/launcher`;
- `loginUrl` = `{api}/api/auth/login`;
- o SWF = `{api}/flash/Loading.swf`.

## O que o launcher espera da API

O contrato completo está em `research/launcher/01-design.md`.

- `GET /api/public/launcher` → lista de servidores, notícias, versão do launcher (`latestVersion`, `minVersion`, `downloadUrl`, `updateUrl`), dados do cliente (`swfUrl`, `configUrl`), `runtimes` (url + sha256) e `defaultRuntime`.
- `POST /api/auth/login` com `{username, password, serverId, client: "launcher"}`:
  - sucesso: `{ play: { flashvars: { user, key, config } } }`, em que `key` é a chave de uso único do fluxo 4.1;
  - erro: `{ message }` em PT-BR, mostrado direto para o jogador.

Se o manifesto não responder, o launcher entra em modo offline com o servidor local (dev).

## Como o jogo é aberto

- **Projector:** `flashplayer_sa.exe "<swfUrl>?user=..&key=..&config=.."`. O projector não aceita parâmetros de flashvars, então elas vão na query string (o Flash expõe esses valores em `loaderInfo.parameters`). Logo depois de abrir, um script PowerShell + user32 (sem módulo nativo) faz o seguinte na janela do jogo:
  - define o título;
  - escolhe **Exibir > Qualidade** (Baixa/Média/Alta);
  - redimensiona a área do jogo para o tamanho escolhido e centraliza a janela;
  - **esconde o menu** (impede abrir outros SWFs pelo Arquivo > Abrir);
  - entra em tela cheia (Ctrl+F), se essa opção estiver ligada.

  Requisitos do servidor: responder o socket policy (porta 843 e/ou na própria porta do jogo) e servir `crossdomain.xml`.
- **Ruffle:** `ruffle.exe -P user=.. -P key=.. --quality .. --width .. --height .. [--fullscreen] [--graphics dx12|vulkan|gl] --power high --tcp-connections allow <swfUrl>`. Flags extras podem ser passadas em `runtimeExtraArgs.ruffle`.

Só uma instância do jogo roda por vez. Quando o jogo fecha, o launcher volta para a tela e pede login de novo, porque a chave de login é de uso único.

## Runtimes: download, sha256 e aviso legal

**Nenhum binário da Adobe vai para o git**: `runtime/` está no `.gitignore`. O launcher procura o executável nesta ordem:

1. caminho configurado (`runtimePaths` / `DDT_PROJECTOR_PATH`);
2. `resources/runtime/<tipo>/` (embutido no build com `fetch-runtime`);
3. `%APPDATA%/DDTank Launcher/runtime/<tipo>/`. Quando o executável não existe, ele é baixado no primeiro "Jogar" a partir da URL do manifesto ou da config. O **sha256 é obrigatório**: se não bater, o arquivo é apagado e o jogo não abre. Se o sha256 mudar no manifesto, o runtime é baixado de novo.

Para embutir no instalador:

```bash
node scripts/fetch-runtime.mjs --hash C:\caminho\flashplayer_32_sa.exe   # calcula o sha256 da sua cópia
DDT_PROJECTOR_URL=https://seu-mirror/flashplayer_32_sa.exe DDT_PROJECTOR_SHA256=<hex> pnpm --filter launcher fetch-runtime projector
pnpm --filter launcher dist:win
```

> **Aviso legal.** O Flash Player é software proprietário da Adobe. Ele não tem suporte desde 31/12/2020 e a Adobe não o distribui mais; a licença nunca permitiu redistribuição livre. Hospedar ou embutir o projector é decisão e risco **do operador do servidor**: use a sua própria cópia arquivada e o seu mirror. O Ruffle (MIT/Apache-2.0) pode ser distribuído livremente; mantenha os arquivos de licença dele.

## Desempenho (o Flash "laga")

O Flash desenha tudo na **CPU, em uma thread só**. O que mais ajuda, em ordem:

1. **Janela no tamanho nativo, 1000×600.** Janela grande ou tela cheia multiplica os pixels desenhados (1080p é cerca de 3,5× mais caro).
2. **Qualidade Média ou Baixa.** A Baixa desliga o antialiasing e dá o maior ganho de FPS. O padrão do launcher é **Média**.
3. **Projector não tem `wmode`.** No plugin, `direct`/`gpu` só aceleram a composição final da imagem, não o desenho do DDTank.
4. **Não force o frame rate.** O SWF define o FPS, e a lógica do jogo depende dele.
5. **Aceleração por GPU de verdade só no Ruffle** (DirectX 12/Vulkan, opção "GPU dedicada"). Ele ganha em resolução alta, mas o ActionScript é interpretado e o cliente ainda precisa de patches.
6. **No PC:** use o plano de energia "Alto desempenho" e feche abas pesadas do navegador.

A solução definitiva é a Fase 2 (cliente PixiJS/WebGL), descrita no `docs/ROADMAP.md`.

## Atualização automática

- **Instalador NSIS:** usa electron-updater (provider `generic`). A URL vem de `manifest.launcher.updateUrl`, ou de `updateUrl` na config, ou de `DDT_UPDATE_URL`. A atualização baixa em segundo plano e aparece o botão "Reiniciar e instalar". Para publicar uma versão, suba `latest.yml` e o instalador da pasta `release/` para essa URL; os scripts nunca rodam `--publish`.
- **Portátil:** não se atualiza sozinho. Quando o manifesto informa uma versão nova, aparece um link para baixar.
- **`minVersion`:** abaixo dessa versão o botão Jogar fica bloqueado.

## Logs

O arquivo fica em `%APPDATA%/DDTank Launcher/logs/launcher.log`; no portátil, em `DDTankLauncherData/logs/` ao lado do `.exe`. Ele é rotacionado em 2 MiB. A saída do Ruffle também entra no log.

**Senhas e chaves (`key=`, `password=`) são mascaradas.** A aba Logs tem filtro por nível, botão "Copiar" e "Abrir pasta".

## Segurança

- `contextIsolation`, `sandbox` e sem `nodeIntegration`.
- CSP restrita e todas as permissões negadas.
- A janela do launcher não navega para lugar nenhum; links abrem no navegador do sistema.
- Toda chamada de rede acontece no processo main.
- A senha nunca é salva; só o usuário, se o jogador marcar "Lembrar".
- Login em HTTP fora de `localhost` gera aviso no log. Em produção, use HTTPS.

## Estrutura

```
src/main/        processo principal: config, api, settings, logger, updater, main.ts (IPC + janela)
src/main/runtime manager (localizar/baixar/sha256), args (linhas de comando), game (spawn), window-win (user32)
src/preload/     ponte contextBridge (window.launcher)
src/renderer/    React: Jogar (servidores, login, notícias), Configurações, Logs
src/shared/      tipos e contrato IPC
scripts/         dev.mjs, mock-api.mjs, fetch-runtime.mjs
electron-builder.yml, launcher.config.example.json, .env.example
```

## Pendências

- Ícone em `build/icon.ico` (hoje usa o ícone padrão do Electron) e assinatura de código: sem assinatura, o Windows mostra o aviso do SmartScreen.
- Conferir no `flashplayer_32_sa.exe` real se o menu Exibir > Qualidade e o atalho Ctrl+F são encontrados. Se não forem, o launcher só registra um aviso no log.
- Conferir as flags do Ruffle com o `--help` da nightly fixada.
