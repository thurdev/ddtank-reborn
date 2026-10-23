# Login / conta

## 1. O que é no jogo
A tela de login (usuário/senha), o anti-cheat de velocidade, a **senha da bolsa**
(segunda senha pra proteger forja/inventário contra hackeamento de conta) e o
desafio anti-bot por texto (**código de verificação**). "Configurações" (vídeo/som)
também entra aqui porque é o mesmo pacote de sessão.

## 2. Onde fica no código
| Cliente (AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| `ddt/manager/SocketManager.as` → `sendLogin` | 1 LOGIN | [`handleLogin`](../../apps/game/src/session/login.ts) via [`basico/login.ts:12`](../../apps/game/src/handlers/basico/login.ts#L12) | `UserLoginHandler.cs` | `member."Accounts"`, `player."Sys_Users_Detail"` |
| `ddt/manager/SocketManager.as` → `sendPint` | 4 PING | [`basico/ping.ts:21`](../../apps/game/src/handlers/basico/ping.ts#L21) (código 5 SYS_DATE)/`:16` (4 PING) | `PingTimeCallBackHandler.cs` | — |
| heartbeat anti-speedhack (cliente `CheckSpeedManager.as`) | 300 BAOLTFUNCTION | [`basico/ping.ts:26`](../../apps/game/src/handlers/basico/ping.ts#L26) `checkSpeedHack` | — | — |
| `baglocked/BagLockedController.as` → `sendBagLocked` | 25 BAG_LOCKED | [`registerSenhaDaBolsa`](../../apps/game/src/handlers/bolsa/senha-da-bolsa.ts) `handlers/bolsa/senha-da-bolsa.ts` | — (Reborn-only; original não tinha) | `player."Sys_Users_Detail"` (`HasBagPassword`, `IsLocked`, `PasswordQuest1/2`) |
| `baglocked/phoneServiceFrames/*.as` → `getBackLockPwdByPhone`/`getBackLockPwdByQuestion`/`deletePwdQuestion`/`deletePwdByPhone`/`checkPhoneBind` | 403 BAGLOCK_PWD | [`registerRecuperarSenha`](../../apps/game/src/handlers/bolsa/recuperar-senha.ts) `handlers/bolsa/recuperar-senha.ts` (m3-baglock-recovery) | `BaglockedHandle.cs` só implementa o sub 5 (hardcoded `true`); 1-4 nunca funcionavam (dependiam de SMS 4399) | mesmas tabelas de `25 BAG_LOCKED` (`player."Sys_Users_Password"` via `db/characters.ts loadBagPassword`), sem migração nova |
| `ddt/view/CheckCodeFrame.as` → `sendCheckCode` | 200 CHECK_CODE | emite: [`game/anti-bot.ts`](../../apps/game/src/game/anti-bot.ts) `showCheckCode`; valida: [`bolsa/codigo-verificacao.ts`](../../apps/game/src/handlers/bolsa/codigo-verificacao.ts) `handleCheckCodeAnswer` | `GamePlayer.cs:1198-1237` (`isPassCheckCode`/`ShowCheckCode`/`resetPassCode`), `CheckCodeHandler.cs:19-49` (validação), `Bussiness/CheckCode.cs` (código+imagem) | `player."Sys_Users_Detail".CheckError` (novo, migração `0026`; `CheckCode` em si fica só em memória — `GamePlayer.checkCode`, ver nota abaixo) |
| `setting/view/SettingView.as` → `sendOpition` | 64 OPTION_UPDATE | [`optionUpdate`](../../apps/game/src/handlers/basico/opcoes.ts#L23) `basico/opcoes.ts:23` | `OptionHandler.cs` | — |

## 3. Fluxo passo a passo
1. Cliente manda `1 LOGIN` com usuário/token → `handleLogin` (`session/login.ts`)
   confere a conta em `member."Accounts"`, carrega o personagem (`db/characters.ts`),
   cria um `GamePlayer` e manda `Out.loginSuccess(...)`.
2. A cada ~5 min o cliente manda `300 BAOLTFUNCTION` → `checkSpeedHack` audita se o
   jogador andou rápido demais (anti-cheat).
3. **Senha da bolsa**: jogador define pergunta+resposta e uma segunda senha
   (`25 BAG_LOCKED` tipo `1`) → grava em `Sys_Users_Detail` e seta `HasBagPassword=true`.
   Depois disso, a Forja e outras ações sensíveis checam `bagLocked()`
   (export canônico em `handlers/bolsa/senha-da-bolsa.ts`; a Forja tem sua própria
   cópia em `handlers/forja/bancada.ts`): se `HasBagPassword && IsLocked`,
   bloqueia a ação e manda a mensagem `"Bag.Locked"`.
   - Cooldown de 3s entre tentativas (`onCooldown`, `bolsa/senha-da-bolsa.ts`) contra brute-force.
   - **Recuperar senha sem saber a atual**: `403 BAGLOCK_PWD` sub 2 `GET_BACK_BY_QUESTION`
     (`recuperar-senha.ts`) — acerta as 2 respostas da pergunta secreta (mesmo cooldown de 3s, `count`
     próprio com chão em 0, nunca negativo) e a senha é limpa (mesma ação do tipo `4` de BAG_LOCKED). Sub
     1/3/4 (telefone) sempre recusam — nunca existiu bind de telefone, nem no original (que também nunca
     funcionava, dependia de SMS do portal 4399 chinês).
4. **Código anti-bot** (41-captcha-anti-bot, `game/anti-bot.ts`): `isPassCheckCode()`
   confere 4 contadores (dinheiro ganho, GP ganho, dissolução de guilda, mover item pro
   Store/ferreiro) cada um contra um limite aleatório sorteado de novo a cada chamada
   (`count_random.Next(min,max)` do original, `GamePlayer.cs:1198-1208`). Passando de
   algum limite (ou já com um desafio pendente), `showCheckCode()` manda `200 CHECK_CODE`
   com uma imagem PNG real (4 dígitos, `check-code-image.ts` — desenho próprio em
   7-segmentos + ruído em vez do GDI+ do original; o cliente só decodifica a imagem,
   nunca re-deriva a resposta dos pixels, então isso não tem efeito de jogo). O jogador
   digita de volta no mesmo `200`: certo reseta os 4 contadores e fecha o popup; errado
   mostra um novo desafio (até 9 erros na conta inteira, `CheckError`, depois disso
   desconecta); a palavra-chave `cheat` desconecta na hora (mesmo comportamento do
   original). **Desligado por padrão**: `Server_Config` `AntiBotCheckCodeEnabled` (0/1,
   default 0) — com a flag off `isPassCheckCode()` sempre retorna `true` e o popup nunca
   aparece, igual ao servidor padrão hoje. 3 pontos reais onde o original chama esse
   gate: dissolver sociedade (`sociedade/criar.ts`), iniciar partida ranqueada com
   `AvgLevel>14` (`salas/iniciar-partida.ts`), mover item pro Store/ferreiro
   (`bolsa/mover.ts`). Desvio documentado NÃO portado: o kick automático do autosave do
   original (`GamePlayer.cs:4485-4489`) tem uma condição que parece invertida (kickaria
   quase todo jogador desafiado nos primeiros 20 min) — replicar isso tornaria a feature
   hostil em vez de discreta, então ficou de fora (ver comentário em `game/anti-bot.ts`).

## 4. Quero mudar…
- **Timeout de speedhack / intervalo do heartbeat**: client manda a cada 5 min
  (`CheckSpeedManager.as`, fixo no SWF); lógica do servidor em `checkSpeedHack`
  (`apps/game/src/session/...` — buscar export `checkSpeedHack`).
- **Cooldown de tentativas de senha da bolsa**: constante `3000` (ms) em
  `onCooldown()`, `handlers/bolsa/senha-da-bolsa.ts`.
- **Throttle do autosave manual (`172 SAVE_DB`)**: constante `30_000` (ms) em
  `basico/salvar.ts` (`lastSave`).
- **Ligar o desafio anti-bot de verdade**: chave `game."Server_Config"` `AntiBotCheckCodeEnabled`
  (lida via `Templates.cfgInt`, mesmo mecanismo de toda outra config inteira do jogo — sem página
  dedicada ainda, edite via `/api/admin/game-config` ou SQL direto) — `1` liga, `0`/ausente (padrão)
  desliga. Os 4 limites aleatórios por contador estão em `randInt(min, maxExclusive)` dentro de
  `isPassCheckCode()`, `game/anti-bot.ts`.

## 5. Testes
- `apps/game/test/handlers.test.ts` — `describe("login")`, `describe("ping / sync / speed check")`.
- `apps/game/test/session.test.ts` — `describe("single session per account")` (não deixa 2 sessões da mesma conta).
- Senha da bolsa: sem teste dedicado hoje (cobertura indireta via `forge-persist.test.ts` que testa `bagLocked`).
- Código anti-bot: `apps/game/test/anti-bot.test.ts` (desligado por padrão passa mesmo com contador
  maxado; ligado — emite desafio real, PNG válido, resposta certa/errada/`cheat`/9+ erros, e o gate real
  em `49 CHANGE_PLACE_GOODS` pro Store).
- Recuperar senha (403 BAGLOCK_PWD): `apps/game/test/client-6600-m3-baglock-recovery.test.ts`.
- Status (41-captcha-anti-bot, 2026-10-24): **OK** login/ping/speedhack/sessão única; senha da bolsa **OK**;
  recuperar senha **OK** (só via pergunta secreta — telefone sempre recusa, sem dado pra validar); código
  anti-bot **OK** (desligado por padrão, `Server_Config.AntiBotCheckCodeEnabled=0` — nunca verificado num
  cliente real com a flag ligada, `verified:no` na matriz); `OPTION_UPDATE` é no-op intencional
  (configurações de vídeo/som são só do cliente).
