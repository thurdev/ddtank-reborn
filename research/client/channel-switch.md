# Troca de canal pelo seletor do hall — o que o cliente faz (ch-troca)

> Objetivo: documentar com precisão o fluxo de "Canal" do cliente Flash (4.1 e 6600) pra decidir o que o
> servidor precisa suportar pra trocar de canal **sem** passar pela tela de login/site de novo.
> Conclusão curta (seção 5): o mecanismo **já funciona de ponta a ponta** com o que `ch-processo`/`ch-bus`
> construíram — não foi preciso nenhum pacote novo nem endpoint novo. O que faltava era o teste dedicado e
> esta documentação.

## 1. Onde fica o seletor de canal (dentro do hall, sem logout)

`serverlist/view/ServerDropList.as` é um `Frame` (`serverlist.hall.DropListCombo`) mostrado dentro do hall —
não é a tela de login. Ao abrir o dropdown (`__onClicked`, linha 55-59) ele chama `updateList()` →
`StartupResourceLoader.Instance.creatServerListLoader()`, que bate em `ServerList.ashx` de novo (o mesmo
endpoint já usado no boot) só pra atualizar estado/Online de cada linha antes de listar as opções
(`vendor/DDTank41/Source Flash/src/serverlist/view/ServerDropList.as:41,135-140`). Nenhum outro `.ashx` é
chamado nesse fluxo.

Clicar num item (`__onListClicked`, linha 67-79) chama `ServerManager.Instance.connentServer(info)`
(`ServerDropList.as:71`). O 6600 tem o componente equivalente (mesmo padrão, arquivo
`vendor/DDT-6600/Flash_Project/DDT660/src/ddt/manager/ServerManager.as`, variáveis renomeadas mas lógica
idêntica).

## 2. `ServerManager.connentServer` — validações e o reconnect

`vendor/DDTank41/Source Flash/src/ddt/manager/ServerManager.as:155-197` (6600: mesmo arquivo, linhas
203-266):

1. Valida nível mínimo/máximo (`MustLevel`/`LowestLevel` contra `PlayerManager.Instance.Self.Grade`) e estado
   da linha (`ALL_FULL`, `MAINTAIN`) — alertas locais, nenhuma chamada ao servidor.
2. Se já está conectado nesse MESMO host:porta e logado (`socket.isSame(...) && isLogin`), só muda o estado
   da UI pra `StateType.MAIN` (reabre o hall local, sem reconectar) — linha 176-180.
3. Senão: `this._current = param1; this.connentCurrentServer();` → **fecha o socket atual e abre um novo**
   pro host:porta do canal escolhido (linha 193-194, 116-120):
   ```
   public function connentCurrentServer() : void {
      SocketManager.Instance.isLogin = false;
      SocketManager.Instance.connect(this._current.IP, this._current.Port);
   }
   ```

## 3. `SocketManager.connect` → `ByteSocket.connect` — fecha o antigo, loga de novo com a MESMA credencial

`ddt/manager/SocketManager.as:101-104`: `connect(ip, port)` delega pro `ByteSocket` (`road7th/comm/
ByteSocket.as:84-110`). `ByteSocket.connect`:
```
if(this._socket) { this.close(); }      // fecha a conexão antiga ANTES de abrir a nova
this._socket = new Socket();
this.addEvent(this._socket);
this._socket.connect(ip, port);
```
`ByteSocket.close()` (linha 181-188) **remove os listeners do socket nativo antes de chamar `.close()`**:
```
public function close() : void {
   this.removeEvent(this._socket);          // <- remove o listener de Event.CLOSE primeiro
   if(this._socket.connected) this._socket.close();
}
```
Como o listener já foi removido, o fechamento deliberado **nunca dispara** `ByteSocket`'s próprio
`Event.CLOSE` → `SocketManager.__socketClose` (que mostra o alerta "conexão caiu" e chama
`LeavePageManager.forcedToLoginPath`, linha 112-116) **não é acionado numa troca de canal normal**. Esse
caminho de erro só dispara num close inesperado de verdade (rede cair, servidor matar a conexão sem o
cliente ter chamado `connect()` de novo). Achado importante: não existe nenhum "aviso de troca" visual nem
pacote de "saindo do canal" — é um reconnect silencioso.

Quando o `Socket` nativo conecta (`Event.CONNECT`), `SocketManager.__socketConnected` (linha 106-110)
dispara `this.out.sendLogin(PlayerManager.Instance.Account)` — **o mesmo `AccountInfo` guardado desde o
primeiro login da sessão** (`PlayerManager.Instance.Account`, setado 1x em `PlayerManager.setup()` a partir
dos flashvars `user`/`key` da página). `GameSocketOut.sendLogin` (`ddt/manager/GameSocketOut.as:49-74`)
manda `Account + "," + Password` (RSA). `Password` aqui é o `tempPwd`/GameKey devolvido por `Login.ashx` no
1º login — **o cliente nunca chama `Login.ashx` de novo pra trocar de canal**, só reenvia o mesmo par
`user,tempPwd` por um socket novo pro host:porta do canal de destino.

Resumindo o que o cliente faz, nessa ordem, ao trocar de canal: **fecha o socket atual (sem avisar o
servidor antigo) → abre um TCP/WS novo pro novo host:porta → manda o pacote LOGIN com a MESMA conta+tempPwd
já usada no primeiro login.** Nenhum `.ashx` novo, nenhum pacote de "troca" dedicado — é um login comum,
só que pro canal 2 em vez do canal 1.

## 4. O que isso exige do servidor (e o que JÁ EXISTE)

Pra esse fluxo funcionar sem relogar no site, 3 coisas precisam ser verdade:

1. **O `tempPwd` (GameKey) precisa ser aceito de novo pelo canal de destino.** `validateGameLogin`
   (`packages/auth/src/index.ts:144-153`) só confere `GameKeyExpiresAt > now` e o hash — **não apaga nem
   marca o GameKey como usado** depois da 1ª vez. TTL padrão 24h (`apps/api/src/config.ts:32`
   `GAME_KEY_TTL_MIN = 24*60`). Ou seja: **o ticket já é reutilizável dentro da janela, pro canal que for** —
   nada precisa mudar aqui.
2. **O canal antigo precisa ser avisado pra salvar e sair (sem brigar com o login novo).**
   `apps/game/src/session/login.ts handleLogin` (linha 97) já chama
   `ctx.crossChannel.kick(ch.UserID)` em TODO login — construído em `ch-bus` (`apps/game/src/bus/
   cross-channel.ts`) pra derrubar sessão de QUALQUER outro canal com `createRedisBus`/`createMemoryBus`
   ativo. Esse kick é o `Game.Server.LoginNext` de sempre, só que via barramento: o canal antigo recebe
   `ch:kick`, manda `kitoff` pro `sink` dele, desconecta e chama `quitPlayer` (salva + `World.remove`) antes
   de responder o ack — exatamente a sequência "não tem online duplo, dado salvo" pedida por esta tarefa.
   Como o cliente JÁ fecha o próprio socket antigo ao reconectar (seção 3), o `c.onClosed` local
   (`apps/game/src/server.ts:317-321`) dispara o MESMO `quitPlayer` de qualquer forma — os dois caminhos
   convergem em `p.quitting ??= doQuit(ctx, p)` (`session/login.ts:226-228`), que é idempotente: não importa
   qual dos dois chega primeiro, só roda uma vez.
3. **O navegador precisa poder abrir socket pro host:porta/WS de QUALQUER canal, não só o local.**
   `apps/api/src/routes/auth.ts channelSocketProxies` (linha 23-48) já monta 1 entrada de `socketProxy` do
   Ruffle por canal habilitado (`player."Server_List" WHERE "Enabled" = true`), com `host`/`port` = o que o
   cliente vai pedir pro socket real (`IP`/`Port` da linha, igual `ServerList.ashx`) e `proxyUrl` = `WsUrl`
   da linha — já escrito em `playConfig` (servido 1x no load da página, então TODOS os canais ficam mapeados
   de antemão, antes de o jogador escolher qualquer um).

**Conclusão**: as 3 peças já existiam antes desta tarefa, construídas por `ch-processo` (ponto 3) e `ch-bus`
(pontos 1 e 2) — o teste de login único entre canais do `ch-bus` (`apps/game/test/ch-bus.test.ts`, describe
"login único entre canais") já exercita, sem saber disso, o MESMO caminho que uma troca de canal real usa:
logar de novo com o mesmo `user,pass` (tempPwd) num canal diferente. O que faltava era nomear e testar esse
cenário como "troca de canal" explicitamente (não só "login duplicado por outro motivo") — ver
`apps/game/test/ch-troca.test.ts`.

## 5. Diferenças 4.1 × 6600

Nenhuma no mecanismo de troca: `ServerManager`/`SocketManager`/`ByteSocket` do 6600
(`vendor/DDT-6600/Flash_Project/DDT660/src/ddt/manager/{ServerManager,SocketManager}.as`,
`vendor/DDT-6600/Flash_Project/DDT660/src/road7th/comm/ByteSocket.as`) seguem o mesmo fluxo: fecha o socket
velho, abre um novo, reenvia LOGIN com a conta já guardada. Diferenças notadas (não bloqueiam a troca):

- 6600 guarda `SelfInfo.LastServerId` (preferência client-side de "último canal", usada só pra auto-login
  quando não há parâmetro de canal explícito — `searchAvailableServer`,
  `vendor/DDT-6600/.../ServerManager.as:141-165`). O 4.1 não tem isso. É puramente local ao SWF (não é
  persistido no servidor); fora do escopo desta tarefa (não pedido, e já funciona sem ele — o jogador
  escolhe o canal todo login, como sempre).
- `ServerListAnalyzer.as` dos dois ajusta o `Port` igual: 4.1 soma 69 (linha 44 do analyzer 4.1,
  `_loc5_.Port = _loc5_.Port + 69`), 6600 usa o valor direto — já é o que `ServerList.ts`/
  `channelSocketProxies` fazem (`docs/GAME-SERVER.md` "Canais").

## 6. Risco / coisa pra ficar de olho (não corrigido aqui, não pedido)

- **Sem `REDIS_URL` (NoopBus)**: `ctx.crossChannel.kick()` não faz nada entre processos
  (`cross-channel.ts:106-112`, `if (!enabled) return`). Com 2+ canais em processos separados e SEM Redis, uma
  troca de canal ainda funciona (o cliente fecha o socket antigo, que já dispara `quitPlayer` local), mas
  fica mais lento: o canal novo não pede o kick explícito, só confia no close do próprio cliente — se a rede
  cair bem no meio (socket antigo não chega a fechar), o jogador fica "online" no canal antigo até o
  heartbeat/GC perceber. Isso já é uma limitação documentada de operar sem Redis (`docs/GAME-SERVER.md`
  "ch-bus"), não uma regressão desta tarefa.
- A troca em si não envia nenhum aviso pro jogador nem pros amigos de que ele "mudou de canal" — pra quem o
  segue (`friendState`), ele simplesmente aparece offline no canal A e online no canal B, dois eventos
  separados via `ctx.crossChannel.friendState` (já existente, `session/login.ts:217-221,257-259`).
