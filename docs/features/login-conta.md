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
| `ddt/view/CheckCodeFrame.as` → `sendCheckCode` | 200 CHECK_CODE | [`bolsa/codigo-verificacao.ts`](../../apps/game/src/handlers/bolsa/codigo-verificacao.ts) | `CheckCodeHandler.cs:782` | `player."Sys_Users_Detail".CheckCode` |
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
4. **Código anti-bot**: `200 CHECK_CODE` confere contra `PlayerInfo.CheckCode` — mas o
   lado que *emite* o desafio (tela aparecer pedindo pra digitar o texto) nunca foi
   portado, então `CheckCode` fica sempre vazio e a checagem sempre passa (`status:
   "partial"`, igual ao early-out do C# original quando `CheckCode` é nulo).

## 4. Quero mudar…
- **Timeout de speedhack / intervalo do heartbeat**: client manda a cada 5 min
  (`CheckSpeedManager.as`, fixo no SWF); lógica do servidor em `checkSpeedHack`
  (`apps/game/src/session/...` — buscar export `checkSpeedHack`).
- **Cooldown de tentativas de senha da bolsa**: constante `3000` (ms) em
  `onCooldown()`, `handlers/bolsa/senha-da-bolsa.ts`.
- **Throttle do autosave manual (`172 SAVE_DB`)**: constante `30_000` (ms) em
  `basico/salvar.ts` (`lastSave`).
- **Ativar o desafio anti-bot de verdade**: precisa portar o lado que gera/mostra o
  `CheckCode` (não existe ainda) — ver `research/qa/port-plan.md` bloco F.

## 5. Testes
- `apps/game/test/handlers.test.ts` — `describe("login")`, `describe("ping / sync / speed check")`.
- `apps/game/test/session.test.ts` — `describe("single session per account")` (não deixa 2 sessões da mesma conta).
- Senha da bolsa / check code: sem teste dedicado hoje (cobertura indireta via `forge-persist.test.ts` que testa `bagLocked`).
- Status: **OK** login/ping/speedhack/sessão única; senha da bolsa **OK**; check code **parcial** (desafio nunca é emitido); `OPTION_UPDATE` é no-op intencional (configurações de vídeo/som são só do cliente).
