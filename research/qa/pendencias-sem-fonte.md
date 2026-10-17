# Pendências sem fonte (sobrou "genérico" / stub) — 2026-10-10

Tudo aqui foi procurado em `vendor/DDTank41` (C# + cliente AS3), `vendor/DDTank4.1` (doador PvE) e
`vendor/DDT-6600`. Não existe código do servidor original pra portar: ou o cliente tem a tela mas o
servidor nunca implementou, ou o script nunca veio no pacote. Decisão pendente com o dono: **inventar
a regra** (a partir do que o cliente espera), **importar de outra fonte** (outra versão/servidor
DDTank) ou **esconder/desligar** a feature no cliente.

## 1. Missões PvE rodando IA genérica — RESOLVIDO (2026-10-11)

~~65 classes de missão sem script~~ → as 65 foram resolvidas: 64 achadas em forks públicos DDTank/Gunny
(`ddt-34-csharp`, MIT; `gunny-3.0`, sem license file) e portadas via `pnpm transpile-pve`; `CoupleBoss15002`
(a única sem C# público em lugar nenhum) foi desenhada à mão a partir de `Mission_Info`/`NPC_Info`. Detalhes,
fontes e o desenho da `CoupleBoss15002`: `research/qa/mission-sources.md`. `KNOWN_SOURCELESS` em
`packages/fight/test/pve-mission-coverage.test.ts` agora está vazia.

<details><summary>Texto original (histórico)</summary>

O jogo funciona (monstros atacam com IA padrão), mas sem o roteiro da missão (falas, fases, boss com
mecânica própria). Lista travada em `packages/fight/test/pve-mission-coverage.test.ts` (`KNOWN_SOURCELESS`).

| Família (prefixo) | Classes | Provável masmorra |
|---|---|---|
| RRCNM74xx–77xx | 16 | (verificar Pve_Info) |
| TVH/TVN/TVT120xx | 12 | modos Difícil/Normal/Fácil de uma mesma masmorra |
| DCNM24xx–27xx | 8 | |
| GAH137x | 5 | |
| GK127x / GT117x / GD1071 | 8 | |
| CBS600-601, DTS700-701, GZS800-801, XDS900-901 | 8 | bosses de evento/série S |
| Aiga4002-4003, DCSM4001, DTGK1166, DTGT1166, CoupleBoss15002, LauDaiPhepThuatH71059-71060 | 8 | |

Classes: Aiga4002 Aiga4003 CBS600 CBS601 CoupleBoss15002 DCNM2401 DCNM2402 DCNM2501 DCNM2502 DCNM2601
DCNM2602 DCNM2701 DCNM2702 DCSM4001 DTGK1166 DTGT1166 DTS700 DTS701 GAH1371 GAH1372 GAH1373 GAH1374
GAH1375 GD1071 GK1271 GK1272 GK1273 GK1274 GT1171 GT1172 GT1173 GZS800 GZS801 LauDaiPhepThuatH71059
LauDaiPhepThuatH71060 RRCNM7401-7404 RRCNM7501-7504 RRCNM7601-7604 RRCNM7701-7704 TVH12001-12004
TVN12001-12004 TVT12001-12004 XDS900 XDS901.

</details>

## 2. Telas do cliente sem servidor (stub / no-op)

| Código | Feature (como aparece no jogo) | Situação |
|---|---|---|
| 391 EQUIP_GHOST | Forja › Espírito do equipamento | **IMPLEMENTADO** 2026-10-11 — fonte externa real (`barrydevp/ddt3.8`, `research/qa/feature-sources.md`), `handlers/forja/espirito-do-equipamento.ts`. Tabela nova `app."SpiritInfo"` (seed `0010_forja_specs_seed.sql`), persiste em `Sys_Users_Detail.GhostEquipList` (coluna já existente). |
| 295 STORE_FINE_SUIT | Forja › Refinar conjunto | **IMPLEMENTADO** 2026-10-11 — fonte externa real (`barrydevp/ddt3.4server`), `handlers/forja/refinar-conjunto.ts`. CORREÇÃO: `SetsBuildTemp` NÃO era tabela nova — já existia no catálogo original como `game."Sets_Build_Temp"` (70 linhas reais), só nunca tinha sido carregada pelo `apps/game`; persiste em `Sys_Users_Detail.fineSuitExp` (coluna já existente). |
| 308 EQUIP_BRING_UP | Forja › Aprimorar (bring-up) | **IMPLEMENTADO** 2026-10-11 — fonte externa real (`barrydevp/ddt3.4server`), `handlers/forja/aprimorar.ts`. Sem tabela nova (reusa `FusionType`/`Property1-4` dos templates de equipamento). |
| 313 ITEM_CELL_IS_LOCKED | Trava de slot | **IMPLEMENTADO** 2026-10-11 — fonte externa trivial (`research/qa/feature-sources.md`), `handlers/forja/trava-slot.ts` |
| 110/111 ITEM_REFINERY | Forja › Refinaria (+ preview) | **IMPLEMENTADO** 2026-10-11 — design próprio (fonte externa só confirma que nenhum fork faz refino de verdade; o `sendItemLianhua` do cliente nem é chamado por nenhuma view), `handlers/forja/refinaria.ts`. Sobe `Sys_Users_Goods.StrengthenRefineryLevel` (coluna já existente, sem migration). Detalhe: `research/qa/feature-designs.md`. |
| 166 LITTLEGAME_COMMAND | Minigame "Đại chiến Hút Gà" (pegar bichinhos) | **IMPLEMENTADO** 2026-10-11 — porte completo do C# real (`LittleGame/**`, ~22 arquivos), `handlers/minigame-termas/`. Falta só o agendamento por horário (`LittleGameStartHourse`/`TimeSpendingHours`) — por ora fica sempre aberto; ver `docs/features/termas.md` §6. |
| 104 / 105 / 239 | Loteria de cartas / Loteria da sorte / ir pra loteria | **IMPLEMENTADO** 2026-10-11 — design próprio, `handlers/progressao/loterias.ts`. Detalhe: `research/qa/feature-designs.md`. |
| 11 ACTIVE_PULLDOWN | Cartão platina de novato | **IMPLEMENTADO** 2026-10-11 — design próprio, junto com a loteria (mesmo arquivo `loterias.ts`). |
| 145 ACTIVITY_SYSTEM / LIGHTROAD / GUILDMEMBERWEEK | Ícones "Atividades", "Caminho da luz", "Semana da sociedade" | **IMPLEMENTADO** 2026-10-11 (sub 64-66 LightRoad e sub 7-13 GuildMemberWeek) — design próprio, `handlers/eventos/caminho-da-luz.ts` (roteador do pacote 145 inteiro) + `handlers/sociedade/semana-da-sociedade.ts`. Sub 37-45 LanternRiddles continua sem handler (fora do pedido). Tabelas novas `app."LightRoadProgress"`/`app."GuildMemberWeekContribution"`. Detalhe: `research/qa/feature-designs.md`. |
| 135 (farm arrange) | Fazenda › "dọn đất" do amigo | **IMPLEMENTADO** 2026-10-11 — sem fonte em lugar nenhum (nem forks externos), design novo em `handlers/fazenda/arrumar.ts` |
| 129/23 DONATE, 129/25 POLL_CANDIDATE | Sociedade › doar / votar candidato | **IMPLEMENTADO** 2026-10-11 — design próprio. 23 DONATE: doa Medalha (achado: o cliente tem `DonateFrame.as` comentado no build atual, redireciona pro doar-Riqueza) alimentando a condição de missão tipo 5, `handlers/sociedade/banco-riqueza.ts`. 25 POLL_CANDIDATE: vota "Membro da Semana", `handlers/sociedade/votacao.ts` + `app."ConsortiaPollVotes"`. Detalhe: `research/qa/feature-designs.md`. |
| PET subs 16/24/25/32 | Mascote (subcomandos) | sem Handle no original |
| 402/4 | Coleção de visuais › sub 4 | desligado no próprio original |
| 188 USE_CONSORTIA_REWORK_NAME, 205 USE_CHANGE_COLOR_SHELL | Renomear sociedade / casca de troca de cor | stub |
| 214 USER_RELOAD_GIFT, 224 CID_CHECK | Recarregar presente / validação de CPF-anti-vício | sem handler (224 é anti-vício chinês) |
| 32 COLLECTINFO, 50 FIGHT_NPC, 89 QUESTION_REPLY | Coleta / lutar com NPC / responder pergunta | stubs documentados |
| 167 CHURCH_MOVIE_OVER, 48 SEll_GOODS | — | mortos (nenhum lugar do cliente chama) — ignorar |

## Atualização 2026-10-11 (busca externa)
Ver `research/qa/feature-sources.md` — busca em GitHub por outros forks DDTank/GunnyII achou fonte real
pra 391/308/295 e confirmou 313/135 implementáveis sem migration (feitos). 110/111, 104/105/239/11 e 145
reconfirmados sem fonte usável em nenhum fork externo.

## Atualização 2026-10-11 (391/308/295 implementados)
391/308/295 foram implementados nesta sessão (`handlers/forja/espirito-do-equipamento.ts`,
`aprimorar.ts`, `refinar-conjunto.ts`). Nenhum precisou de migration "de verdade" pra dados do
jogador — `fineSuitExp` e `GhostEquipList` JÁ existiam em `Sys_Users_Detail` (reservados, nunca
escritos). Só o 391 precisou de tabela de template nova (`app."SpiritInfo"`, dados reais do fork,
ver `THIRD_PARTY_NOTICES.md`); a tabela do 295 (`SetsBuildTemp`) JÁ existia no catálogo original
como `game."Sets_Build_Temp"` (achado corrigindo a suposição anterior desta pesquisa — ver
`packages/db/src/schema/app.ts`).

## Sugestões pra decidir depois
- **Missões genéricas:** procurar outro pack de servidor DDTank (ex.: forks "DDTank 3.x/4.x Remake",
  "GunnyArena", servidores vietnamitas `Gunny`) que tenha `GameServerScript/AI/Messions/<Classe>.cs`;
  se não achar, escrever o roteiro a partir dos dados de `Mission_Info`/`NPC_Info` (falas, HP, fases).
- **Telas sem servidor:** decidir por feature: implementar regra própria (ex.: Espírito do equipamento =
  subir atributo com pedra) ou esconder o botão no cliente (overlay SWF / language).
