/**
 * Aba no jogo: nenhuma (sem tela própria) — três pacotes de missão sem handler algum no C# original
 * (confirmado: nenhum `[PacketHandler(...)]` nos três códigos em `Game.Server/Packets/Client/*.cs`, só a
 * entrada no enum `ePackageType.cs`), documentados individualmente abaixo. Noop fiel é o comportamento real
 * — não pendência — por isso "implemented" (41-stubs-rates), não "stub". Mantidos como "lê e descarta" só
 * pra conexão não logar código desconhecido.
 *
 *   50 FIGHT_NPC    — "lutar com NPC": o cliente AS3 define `sendBeginFightNpc()`, mas nenhuma tela chama
 *                      (código morto — `MatchRoomView.MATCH_NPC_ENABLE` é permanentemente `false`); sem
 *                      corpo (`ePackageType.cs:101`).
 *   32 COLLECTINFO  — "coletar" (verificação de SMS/celular, `InfoCollectView.as:197` `sendCollectInfoValidate`,
 *                      byte Type + string código de 6 dígitos): a validação de verdade vai por HTTP
 *                      (`SendActiveKeySystem.ashx`, fora de escopo — precisaria de um gateway de SMS de
 *                      verdade) e o cliente nunca lê resposta deste socket (`ePackageType.cs:33`, 0x20).
 *   89 QUESTION_REPLY — `sendQuestionReply()` só dispara de `QuestionInfoMannager.__AnswerBoxQuestion`, que só
 *                        roda a partir de um `ANSWERBOX_QUESTIN` (código 31, reaproveitado com GOODS_EXCHANGE
 *                        no próprio enum do cliente) que nenhum handler C# do DDTank41 ou DDT-6600 manda — ou
 *                        seja, essa resposta nunca pode ser disparada de fato pelo servidor real também
 *                        (`ePackageType.cs:231`, int).
 *
 * Como testar: `apps/game/test/activities.test.ts` (cobertura de pacotes sem handler). Manual:
 * `docs/features/missoes.md`, `docs/features/pve-masmorras.md`.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerMissoesStubs(r: HandlerRegistry): void {
  r.player(50, "FIGHT_NPC", () => {});
  r.player(32, "COLLECTINFO", (_ctx, _p, pkt) => {
    pkt.readByte();
    pkt.readString();
  });
  r.player(89, "QUESTION_REPLY", (_ctx, _p, pkt) => {
    pkt.readInt();
  });
}
