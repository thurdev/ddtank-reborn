# Porte completo C# → TS — levantamento e divisão (2026-10-09)

Fontes: `node tools/qa/packet-coverage.mjs` (pacotes que o cliente 4.1 manda sem handler/stub/partial) +
`docs/qa-matrix.json` (361 itens; parte já portada hoje: 54/55/66/57/46/126/77/171/222/265/196/203/119/200/130/25,
61 transferência, 106 dourar). C#: `vendor/DDTank41/Game.Server/**` (handlers em `Packets/Client`, lógica em
`GameObjects`, `Managers`, `Bussiness`), referência extra `vendor/DDT-6600` quando o 4.1 não tem.

Regra de arquivos: cada agente só edita os arquivos do seu bloco. Compartilhados:
- `apps/game/src/packets/out.ts`: só ACRESCENTAR no fim, reler antes de editar.
- `apps/game/src/handlers/index.ts`: só 1 linha de registro por arquivo novo.
- `docs/qa-matrix.json`: NÃO editar (conflito); cada agente escreve `research/qa/port-<bloco>.md`.

| Bloco | Dono de | O que falta |
|---|---|---|
| A Ferreiro avançado | `handlers/forge.ts`, `handlers/forge-extra.ts` (novo) | 138 ITEM_ADVANCE, 95 NECKLACE_STRENGTH, 133 LATENT_ENERGY, 209 FIGHT_SPIRIT, 295 STORE_FINE_SUIT, 391 EQUIP_GHOST, 110 ITEM_REFINERY, EQUIP_BRING_UP, ITEM_CELL_IS_LOCKED, compose/strengthen partial, abas Forno/"Gia Công" (ForgeMainView: wishbead/exalt/latent/gemstone) |
| B Progressão | `handlers/progression.ts` (novo), `game/cards.ts` | TOTEM (OpenOneTotemHandler), HONOR_UP (HonorUpHandler), AVATAR_COLLECTION, GET_PLAYER_CARD, CARD_LOTTERY 104, LUCK_LOTTERY 105, ACTIVE_PULLDOWN 11, GOTO_CARD_LOTTERY |
| C Eventos | `handlers/activities.ts`, `handlers/events.ts` | ACTIVITY_PACKAGE, NEWCHICKENBOX (10 subs), LEFT_GUN_ROULETTE, GUILDMEMBERWEEK, ACTIVITY_SYSTEM, LIGHTROAD, WORLDBOSS_CMD, LITTLEGAME_COMMAND, NOVICEACTIVITY |
| D Social | `handlers/marriage.ts`, `handlers/hotspring.ts`, `handlers/farm.ts`, `handlers/social.ts`, `handlers/academy.ts` | MARRY_CMD/ROOM/SCENE (14), CHURCH_MOVIE_OVER 167, HOTSPRING_ROOM_CREATE 175, FARM (13 subs), SNS/INVITE_FRIEND/FRIEND_BIRTHDAY |
| E PvE/Salas/Missões | `handlers/rooms.ts`, `handlers/quests.ts`, `packages/fight/**` | LABYRINTH (7), FIGHT_NPC 50, ELITEGAME (4), USER_ANSWER/QUESTION_REPLY 89, GOODS_EXCHANGE 31, COLLECTINFO 32, GAME_CMD stubs (6) |
| F Guilda/Leilão/Pets/Conta | `handlers/consortia.ts`, `handlers/auction.ts`, `handlers/pets.ts`, `handlers/mail.ts`, `handlers/basic.ts`, `handlers/chat.ts` | CONSORTIA_CMD stubs, AUCTION_ADD/UPDATE partial, PET stubs (4), USER_RELOAD_GIFT 214, CID_CHECK 224, SCENE_STATE |
| (rodando) Loja/Prop | `handlers/items.ts`, `use.ts`, `shop-prop.ts`, `account-security.ts` | resto do packet-coverage desses |
| (rodando) Persistência | `db/**`, `game/player.ts`, `session/login.ts` | teste salvar-sair-voltar de tudo |
| (rodando) Admin | `apps/admin/**`, `apps/api/src/routes/admin.ts` | admin espelho do jogo |
