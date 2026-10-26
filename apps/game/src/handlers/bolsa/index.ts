/**
 * Aba no jogo: índice da Bolsa + Personagem inteiros — registra todos os pacotes de inventário, equipamento,
 * conta e senha da bolsa. Cada ação tem o seu próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   mover.ts                    (Bolsa › arrastar item)       — 49  CHANGE_PLACE_GOODS
 *   desacorrentar-equipamento.ts(Bolsa › desacorrentar)       — 47  UNCHAIN_EQUIP
 *   reciclar.ts                 (Bolsa › reciclar)            — 127 REClAIM_GOODS
 *   ver-equipamento.ts          (Personagem › ver equip)      — 74  ITEM_EQUIP
 *   mostrar-guilda.ts           (Personagem › tag de guilda)  — 34  USER_RANK
 *   trocar-sexo.ts              (Bolsa › usar cartão de sexo) — 252 USE_CHANGE_SEX
 *   trocar-apelido.ts           (Bolsa › usar cartão de nome) — 171 USE_REWORK_NAME
 *   trocar-apelido-guilda.ts    (Bolsa › cartão de nome do clã)— 188 USE_CONSORTIA_REWORK_NAME
 *   trocar-cor.ts               (Equipamento › trocar cor)    — 182 USE_COLOR_CARD
 *   titulos.ts                  (Personagem › títulos)        — 189 USER_CHANGE_RANK, 265 NEWTITLE_CARD
 *   presentes-recebidos.ts      (Personagem › presentes)      — 218 USER_GET_GIFTS
 *   conquistas.ts               (Personagem › conquistas)     — 203 LOOKUP_EFFORT
 *   comparar-item.ts            (Chat › link de item)         — 119 LINKREQUEST_GOODS
 *   reroll-carta.ts             (Cartas › reroll de atributo) — 196 CARD_RESET
 *   reaproveitar-forja.ts       (Forja › bancada, reaproveitar)— 222 EQUIP_RECYCLE_ITEM
 *   descartar-prop-luta.ts      (luta › descartar prop)       — 75  PROP_DELETE
 *   pegar-item-temporario.ts    (Bolsa › recolher temporário)  — 108 GAME_TAKE_TEMP
 *   item-vencido.ts             (Bolsa › vencimento)          — 77  ITEM_OVERDUE
 *   abrir-caixa.ts              (Bolsa › abrir caixa)         — 63  ITEM_OPENUP
 *   usar-carta.ts               (Bolsa › usar carta)          — 183 CARD_USE
 *   treino-atributos.ts         (texpSystem › usar pergaminho)— 99  TEXP
 *   treino-diario.ts             (bolsa nova › Sist. Treino)   — 155 EVERYDAY_ACTIVEPOINT
 *   organizar-bolsa.ts          (Bolsa › organizar)           — 124 CHANGE_PLACE_GOODS_ALL
 *   ocultar-visual.ts           (Equipamento › esconder)      — 60  ITEM_HIDE
 *   senha-da-bolsa.ts           (Login/conta › senha 2ª)      — 25  BAG_LOCKED (+ `bagLocked()` compartilhado)
 *   recuperar-senha.ts          (Login/conta › recuperar senha)— 403 BAGLOCK_PWD
 *   vender-item.ts              (Bolsa › vender item)         — 48  SEll_GOODS (design próprio, sem fonte C#)
 *   codigo-verificacao.ts       (sem tela própria, nunca emitido) — 200 CHECK_CODE
 *   correio-excedente.ts        (sem tela própria, usado por quase tudo acima) — `mailItems()`
 *   stubs.ts                    (sem tela própria)            — 42 DELETE_GOODS (vivo, no-op) + 205 (morto, no-op)
 *
 * Pacotes: ver tabela acima.
 * C#: ver cabeçalho de cada arquivo listado.
 * Como testar: `apps/game/test/handlers.test.ts`, `apps/game/test/formulas.test.ts`, `apps/game/test/forge-persist.test.ts`.
 * Manual: `docs/features/bolsa-personagem.md` e `docs/features/login-conta.md` têm o passo a passo de cada ação.
 */
import type { HandlerRegistry } from "../registry.js";
import { registerMoverItem } from "./mover.js";
import { registerDesacorrentarEquipamento } from "./desacorrentar-equipamento.js";
import { registerReciclar } from "./reciclar.js";
import { registerVerEquipamento } from "./ver-equipamento.js";
import { registerMostrarGuilda } from "./mostrar-guilda.js";
import { registerTrocarSexo } from "./trocar-sexo.js";
import { registerTrocarApelido } from "./trocar-apelido.js";
import { registerTrocarApelidoGuilda } from "./trocar-apelido-guilda.js";
import { registerTrocarCor } from "./trocar-cor.js";
import { registerTitulos } from "./titulos.js";
import { registerPresentesRecebidos } from "./presentes-recebidos.js";
import { registerConquistas } from "./conquistas.js";
import { registerCompararItem } from "./comparar-item.js";
import { registerRerollCarta } from "./reroll-carta.js";
import { registerReaproveitarForja } from "./reaproveitar-forja.js";
import { registerDescartarPropLuta } from "./descartar-prop-luta.js";
import { registerPegarItemTemporario } from "./pegar-item-temporario.js";
import { registerItemVencido } from "./item-vencido.js";
import { registerAbrirCaixa } from "./abrir-caixa.js";
import { registerUsarCarta } from "./usar-carta.js";
import { registerTreinoAtributos } from "./treino-atributos.js";
import { registerTreinoDiario } from "./treino-diario.js";
import { registerOrganizarBolsa } from "./organizar-bolsa.js";
import { registerOcultarVisual } from "./ocultar-visual.js";
import { registerSenhaDaBolsa } from "./senha-da-bolsa.js";
import { registerRecuperarSenha } from "./recuperar-senha.js";
import { registerVenderItem } from "./vender-item.js";
import { registerCodigoVerificacao } from "./codigo-verificacao.js";
import { registerStubsBolsa } from "./stubs.js";

export function registerBolsa(r: HandlerRegistry): void {
  registerMoverItem(r);
  registerDesacorrentarEquipamento(r);
  registerReciclar(r);
  registerVerEquipamento(r);
  registerMostrarGuilda(r);
  registerTrocarSexo(r);
  registerTrocarApelido(r);
  registerTrocarApelidoGuilda(r);
  registerTrocarCor(r);
  registerTitulos(r);
  registerPresentesRecebidos(r);
  registerConquistas(r);
  registerCompararItem(r);
  registerRerollCarta(r);
  registerReaproveitarForja(r);
  registerDescartarPropLuta(r);
  registerPegarItemTemporario(r);
  registerItemVencido(r);
  registerAbrirCaixa(r);
  registerUsarCarta(r);
  registerTreinoAtributos(r);
  registerTreinoDiario(r);
  registerOrganizarBolsa(r);
  registerOcultarVisual(r);
  registerSenhaDaBolsa(r);
  registerRecuperarSenha(r);
  registerVenderItem(r);
  registerCodigoVerificacao(r);
  registerStubsBolsa(r);
}
