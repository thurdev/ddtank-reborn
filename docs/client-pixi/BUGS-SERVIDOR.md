# Bugs de servidor achados pelo cliente PixiJS

O cliente PixiJS é o código AS3 original convertido: ele lê os pacotes
**exatamente** como o Flash lia. Quando uma tela não abre e o console (com
`?debug=true`) mostra `[SocketManager] erro tratando pacote N: ... Error #2030:
End of file`, o servidor (`apps/game`) mandou o pacote num formato diferente do
que o cliente 4.1 espera — o Ruffle falharia igual (só que calado).

Como achar: `?debug=true` mostra cada pacote com subtipo (ex.:
`FARM/ENTER_FARM — 311 bytes`) e o erro com a pilha. Compare a leitura no
cliente (`apps/client/src/game/...`) com o C# original
(`vendor/DDTank41/Game.Server/Packets/Packets/AbstractPacketLib.cs`).

## Abertos

(nenhum no momento)

## Resolvidos

### Fazenda — `81 FARM/ENTER_FARM` (e `PAY_FIELD`, `FARM_LAND_INFO`) — corrigido em `f594c379`

- Sintoma: clicar no ícone da Fazenda no hall não faz nada (nível ≥ 25).
- Cliente lê (`farm/FarmModelController.__onEnterFarm`):
  `int farmId, bool isFarmHelper, int isAutoId, date AutoPayTime, int AutoValidDate,
  int GainFieldId, int KillCropId, int count`, e por terreno
  `int FieldID, int SeedID, date PayTime, date PlantTime, int GainCount,
  int FieldValidDate, int AccelerateTime`; se a fazenda é do próprio jogador:
  `int FastGrowNeedMoney, utf PayFieldMoney, utf PayAutoMoney, date AutoPayTime,
  int AutoValidDate, int VIPLevel, int buyExpRemainNum`; senão `bool isArrange`.
- C#: `AbstractPacketLib.SendEnterFarm` (linha ~2299), `SendPayFields` (~2399).
- Servidor TS hoje (`apps/game/src/handlers/fazenda/estado.ts` `farmSnapshot`):
  `int ownerId, string ownerName, bool isHelper, int count` + terrenos em outra
  ordem, sem o bloco final → o cliente estoura o fim do pacote.
- Vale revisar o módulo `handlers/fazenda/` inteiro contra o C# (`fieldPacket`
  sub 17 também usa ordem própria).
