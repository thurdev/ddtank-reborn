# M0 — Boot do cliente 6600 (sem rodar nada, só leitura de fonte)

> Pesquisa apenas. Objetivo: o que o cliente 6600 carrega do zero até abrir o socket de
> jogo, e como isso difere do que `apps/api` já serve hoje. Fonte: ASP.NET markup
> (`vendor/DDT-6600/WebSimple/*.aspx`), C# dos endpoints (`vendor/DDT-6600/Source/Tank.Request`)
> e `config.xml`. Não há fonte AS3 da tela de Loading/Login no `Flash_Project` deste vendor
> (só a partir do hall em diante) — o fluxo de boot foi reconstruído do lado servidor.

## Sequência de boot (do HTML até o socket)

1. **`Default.aspx`** — página HTML host. `<object>`/`<embed>` carrega
   `<%=Flash%>Loading.swf?<%=Content%>&config=<%=Config%>` com `FlashVars=<%=AutoParam%>`.
   `Flash` vem de `config.xml` (`FLASHSITE`), e aponta pra pasta
   `Flash_6600_v040/` servida estaticamente. Igual ao padrão 4.1 (`DDT_Loading.swf`
   hoje servido por `apps/api/assets/flash`).
2. **`config.xml`** (raiz de `WebSimple/`) — primeiro XML lido pelo `Loading.swf`. Define:
   - `LANGUAGE="turkey"` (idioma do pack — a cópia que restaurei é um server **turco**
     rodando build BR/the9, não um server BR "puro"; `OFFICIAL_SITE`/`GAME_FORUM` apontam
     pra `br.337.com`, então é um híbrido — cuidado ao copiar textos literalmente, vários
     campos de config têm URL turca/chinesa misturada com domínio BR).
   - `REQUEST_PATH`, `LOGIN_PATH`, `FILL_PATH`, `COUNT_PATH` — hosts separados por função
     (igual à 4.1: hoje `apps/api` serve tudo sob um host só, isso não muda).
   - Flags de feature client-side ligando/desligando telas por `enable=`: `KINGBLESS`,
     `GEMSTONE`, `GODSYAH`, `TREASURE` (desligado! `enable="false"`), `ENERGY_ENABLE`
     (desligado), `ENCOUNTER` (desligado), `LOTTERY` (desligado), `LUCKY_NUMBER`
     (desligado) — **útil pra M1**: podemos portar o cliente 6600 inteiro e simplesmente
     deixar essas flags desligadas pras features que ainda não implementamos no servidor,
     em vez de remover SWF do pacote. Reduz risco de quebrar o client por módulo ausente.
   - `DUNGEON_OPENLIST="1,2,3,4,5,6,7,8,9,10,11,12,13"` — 13 dungeons habilitadas por id,
     mesmo padrão que `Map_Server`/`Map_Week` do nosso schema hoje.
   - `GAME_FRAME_CONFIG` define o tick do jogo em 40ms (25 fps) com tolerância 35-45ms —
     constante de física do client, não protocolo; já é a mesma taxa que a 4.1 usa
     (confirma `research/client/02-ruffle-report.md` não precisa reavaliar frame rate).
3. **Policy file** — `POLICY_FILES/file` aponta pra `http://.../crossdomain.xml` (porta
   do próprio web host, não a porta 843 de socket policy). O **socket policy server na
   porta 843** (que `apps/game` já serve) é carregado separadamente pelo Flash Player
   quando o client tenta abrir o `Socket` pro IP:porta do game server — não aparece no
   `config.xml`, é comportamento padrão do runtime AVM2. Sem mudança de código aqui.
4. **Tela de login do client** faz (nessa ordem, inferido dos `.ashx`/`.aspx` disponíveis
   em `vendor/DDT-6600/Request/` + o que cada handler espera como parâmro):
   - `LoginSelectList.ashx?username=...` — lista de personagens/contas pro username (pra
     UI de múltiplos personagens por conta, se existir). Handler: `Tank.Request.LoginSelectList`
     → `PlayerBussiness.GetUserLoginList(userName)`. **Idêntico em estrutura ao nosso**
     `apps/api/src/request/endpoints/LoginSelectList.ts` (mesmo nome de endpoint já
     registrado).
   - `Login.ashx?p=<RSA>` — o pacote real de autenticação. Parâmetro `p` é
     `RsaDecryt2(RsaCryptor, p)` → UTF8 a partir do byte 7 → split por vírgula em
     **4 campos**: `userName, text3 (não usado), userPass, nickname`. Chama
     `PlayerManager.Login(user,pass)` então `BaseInterface.CreateLogin(...)` e devolve um
     XML `<Result><Item ID=... IsFirst=... NickName=... ... value="true" message="..."/></Result>`
     com ~40 atributos do personagem (stats, guild, casamento, etc.) pra popular a tela
     antes mesmo de conectar no socket. **Mesmo formato/mesmo nome de endpoint que
     `apps/api/src/request/endpoints/Login.ts` já implementa** — comparar atributo por
     atributo quando for portar (o 6600 tem campos novos no XML:
     `WeaklessGuildProgressStr`, `IsOldPlayer`, `Nimbus`, `FightPower`, `AnswerSite`
     — nenhum desses é crypto, são só dados de exibição; adicionar como campos extra
     opcionais no builder, não quebra nada existente).
   - `CreateLogin.ashx` — criação de conta/personagem nova. Mesmo nome de endpoint já
     registrado em `apps/api`.
5. **Socket de jogo**: depois do `Login.ashx` devolver sucesso, o client abre o socket TCP
   (porta do `Server_List`/`ServerInfo` devolvido) e faz o handshake binário —
   **idêntico ao que `packages/protocol` já implementa**: `RSAKEY=7` → `LOGIN=1` →
   `PING=4`/`SYS_DATE=5`/`SYS_MESSAGE=3`/`NETWORK=6` (confirmado por
   `docs/plan/MIGRACAO-6600.md` §1.4: esses códigos são idênticos entre 4.1 e 6600). Não
   há handshake HTTP adicional depois disso — o resto da sessão é só pacotes binários.

## Endpoint novo e não óbvio: `directlogin.ashx` (SSO externo, não é o login principal)

`Tank.Request.directlogin` recebe `username` + `phpkey`, valida contra
`ConfigurationManager.AppSettings["PHP_Key"]`, gera um GUID de sessão temporário e chama de
volta um serviço `BaseInterface.LoginUrl` (login server-to-server, não é o fluxo do
jogador). Serve pra login automático vindo de um portal externo (ex. `the9`/`337.com`,
ver `EXTERNAL_INTERFACE` em `config.xml`). **Não precisa ser portado** — não temos
(nem queremos) um portal externo de terceiros fazendo SSO; nosso `apps/web` já é o único
"portal". Risco zero pra M1.

## Endpoint novo real a decidir: `AASGetState.aspx` / `AASUpdateState.aspx`

Decodificado por leitura de código (não estava nos comentários do dono, só "AAS não
decodificado" em §1.3 do plano): **AAS = Anti-Addiction System** (sistema anti-vício
chinês/de alguns portais asiáticos — exige registro de nome real + número de identidade
pra menores de idade, com limite de horas de jogo). Confirmado em
`vendor/DDT-6600/Source/SqlDataProvider/SqlDataProvider/Data/AASInfo.cs`: campos
`UserID, Name, IDNumber, State`. `AASGetState.aspx` (`Tank.Request.AASGetState`) só
responde se o IP do chamador bate com `AdminIP` (allowlist), e repassa pra
`CenterServiceClient.AASGetState()` (RPC pro Center Server) — é uma API **administrativa**,
não algo que o client de jogador chama durante boot normal. Chamada real do client pro
sistema AAS em si (perguntar/gravar nome+CPF do jogador) não apareceu nos `.ashx`
disponíveis neste vendor — pode estar embutido no fluxo de registro
(`CreateLogin`/`AccountRegister`) via campo opcional, não um endpoint próprio.

**Recomendação pra M1**: não portar AAS. Não é uma feature de gameplay pedida pelo dono,
é compliance regulatório de outro país (China/Coreia/exigência de portal asiático) sem
sentido pra um server BR. Se o client 6600 chamar algo relacionado no boot e travar sem
resposta, a solução é um stub que sempre responde "maior de idade, sem restrição" (valor
`2` — que é literalmente o default no `AASGetState.cs` quando a validação de IP falha:
`int num = 2;` antes do try).

## Diferença de crypto/handshake: nenhuma encontrada

Como o §1.4 do plano já tinha concluído por diff de enum, não achei nada no código C#
destes dois endpoints (`Login.cs`, `directlogin.cs`) que mude o algoritmo RSA ou o formato
do pacote — é literalmente a mesma função `CryptoHelper.RsaDecryt2(StaticFunction.RsaCryptor, ...)`
e o mesmo split de 4 campos por vírgula que a 4.1 usa (conferido de memória do código 4.1
equivalente, mesmo padrão). **`packages/protocol` não precisa de nenhuma mudança pro M1.**

## Pendência que fica pra depois do M0 (fora de escopo aqui)

`research/client/02-ruffle-report.md` precisa ser refeito contra o SWF compilado
(`Loading.swf`/`DDT_Loading.swf` do 6600) subindo de fato no Ruffle — isso exige executar o
cliente num browser, que está fora do escopo de pesquisa estática pedida aqui (e o ambiente
tinha Playwright em uso, então não tentei). Fica como item do M1 conforme já estava listado
em `docs/plan/MIGRACAO-6600.md` §5.
