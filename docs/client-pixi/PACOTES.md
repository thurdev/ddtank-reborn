# Pacotes (protocolo cliente ↔ servidor)

O cliente fala exatamente o protocolo binário do DDTank 4.1. Só o transporte
mudou: TCP → **WebSocket** (`apps/game`, porta 9300, caminho `/ws`).

## Formato

Cabeçalho de 20 bytes (`0x71AB`, tamanho, checksum, **código**, id do
jogador, ...) + corpo. Depois do login o corpo é cifrado com a chave de 8
bytes que o cliente manda (RSA) no pacote `LOGIN`. Implementação de
referência (mesma regra dos dois lados): `packages/protocol`
(`packet.ts`, `cipher.ts`, `framer.ts`).

No cliente:

| Arquivo | Papel |
|---|---|
| `src/game/road7th/comm/ByteSocket.ts` | envia/recebe, cifra, separa pacotes |
| `src/game/road7th/comm/PackageOut.ts` / `PackageIn.ts` | escrever/ler campos (`writeInt`, `readUTF`...) |
| `src/game/ddt/manager/GameSocketOut.ts` | **todo pacote enviado** (um método por ação: `sendLogin`, `createRoom`...) |
| `src/game/ddt/manager/SocketManager.ts` | **todo pacote recebido**: converte o código em `CrazyTankSocketEvent` |
| `src/game/ddt/data/socket/ePackageType.ts` | nomes dos códigos (`LOGIN = 1`, `GRID_GOODS = 64`...) |
| `src/game/ddt/data/socket/*PackageType.ts` | subcódigos por sistema (igreja, guilda, fazenda...) |

Lista completa com origem: `packages/protocol/src/codes/client.ts` (gerada).
Servidor: `apps/game/src/handlers/` (ver `apps/game/HANDLERS.md`).

## Ver os pacotes

`?debug=true` → cada pacote aparece no console:

```
[packet] ↑ enviado 1 (0x0001) LOGIN — 156 bytes
[packet] ↓ recebido 67 (0x0043) UPDATE_PLAYER_INFO — 327 bytes
```

Abra o grupo pra inspecionar o `PackageIn/PackageOut` (bytes e posição).
Erro ao tratar um pacote aparece como `erro tratando pacote <código>`.

## Criar um pacote novo

1. Escolha o código (livre nos dois lados) e ponha o nome em `ePackageType.ts`.
2. **Enviar:** método em `GameSocketOut.ts`:
   ```ts
   sendMinhaAcao(id: number): void {
     const pkg = new PackageOut(ePackageType.MINHA_ACAO);
     pkg.writeInt(id);
     this.sendPackage(pkg);
   }
   ```
3. **Receber:** em `SocketManager.ts`, no `switch` do código, dispare um
   `CrazyTankSocketEvent` e escute onde precisar:
   `SocketManager.Instance.addEventListener(CrazyTankSocketEvent.MINHA_ACAO, fn)`.
4. Servidor: handler em `apps/game/src/handlers/` lendo os campos na mesma ordem.
