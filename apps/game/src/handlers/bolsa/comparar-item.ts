/**
 * Aba no jogo: Chat — comparar item pelo link compartilhado no chat (ícone de item clicável na mensagem).
 * Pacote: 119 LINKREQUEST_GOODS. `num` 4/5 são sub-modos "link" que o original deixa totalmente zerados
 * (sem tabela de stats de usuário migrada pra eles também); o caso padrão é o payload real de comparação.
 * C#: `GetLinkGoodsHandler.cs:695` (4.1) / `Game.Server.Packets.Client/GetLinkGoodsHandler.cs` (6600, decompilado
 * por completo — os dois arquivos existem no vendor).
 * Como testar: `apps/game/test/client-6600-m2-bolsa.test.ts`. Manual: clicar num link de item no chat → ver
 * stats completos.
 *
 * NOVO (m2-bolsa): request e resposta mudam entre as duas versões, achado comparando os dois `.cs` reais
 * (não só o AS3) + `ChatManager.as __goodLinkGetHandler` 4.1 vs 6600:
 * - Request (ANTES do switch): 4.1 lê `num(int), string(descartada), itemID(int)` — bate com o sender AS3 4.1
 *   (`GameSocketOut.as sendGetLinkGoodsInfo(type, key)`, só 2 campos — o 3º campo que o C# 4.1 lê não existe no
 *   sender, gap pré-existente da própria 4.1, não é regressão desta tarefa, não tocado). 6600 lê `num(int),
 *   key(string), templeteIDorItemID(string)` — bate com o sender 6600 (`sendGetLinkGoodsInfo(type, key,
 *   templeteIDorItemID="")`, 3 campos, os 2 últimos STRING); o C# 6600 resolve `itemID =
 *   Convert.ToInt32(templeteIDorItemID != "" ? templeteIDorItemID : key)`.
 * - Resposta (caso padrão, item achado): 6600 insere +2 ints (`MagicAttack`/`MagicDefence`, lidos
 *   incondicionalmente pelo `ChatManager.as` 6600 — dano mágico por item, mesmo sistema não implementado dos
 *   outros pacotes, `research/6600/packets-m1.md` Round 2) entre `DefendCompose` e `ValidDate`; e, no fim,
 *   `isGold`/`goldValidDate`/`goldBeginTime` (o C# 6600 ESCREVE isso — 4.1 nunca escreveu, gap pré-existente da
 *   4.1 preservado tal qual) seguido de +1 int `MagicLevel` que o `ChatManager.as` 6600 lê mas o `.cs` 6600 NUNCA
 *   escreve (bug real do 6600 original — replicar o crash de EOF não ajuda ninguém, então mandamos `0` pra não
 *   estourar `Error #2030` no cliente, mesmo padrão de stub de todo o resto do M1/M2).
 * - Casos `num===4`/`num===5` (links zerados): byte-a-byte IDÊNTICOS nos dois `.cs` (mesma contagem de
 *   `WriteInt(0)`, 5 e 8 respectivamente, e o mesmo `packet.ReadString()` extra em `case 5`) — nenhum fix aqui,
 *   só o significado do lado do cliente muda (4.1 CardInfo vs 6600 CardGroove/CardInfo reduzido).
 */
import { loadItemById } from "../../db/items.js";
import { GSPacket } from "@ddt/protocol";
import { wireDate } from "../../util/time.js";
import type { HandlerRegistry } from "../registry.js";

export function registerCompararItem(r: HandlerRegistry): void {
  r.player(119, "LINKREQUEST_GOODS", async (ctx, p, pkt) => {
    const num = pkt.readInt();
    let itemId: number;
    if (p.clientKind === "6600") {
      // sendGetLinkGoodsInfo(type, key, templeteIDorItemID="") — os 2 últimos campos são STRING no 6600.
      const key = pkt.readString();
      const idStr = pkt.readString();
      itemId = parseInt(idStr || key, 10) || 0;
    } else {
      pkt.readString(); // nickname param — read and discarded like the original
      itemId = pkt.readInt();
    }
    const out = new GSPacket(119, p.id);
    out.writeInt(num);
    if (num === 4) {
      out.writeString(p.info.NickName ?? "");
      for (let i = 0; i < 5; i++) out.writeInt(0);
      return p.send(out);
    }
    if (num === 5) {
      pkt.readString();
      out.writeString(p.info.NickName ?? "");
      for (let i = 0; i < 8; i++) out.writeInt(0);
      return p.send(out);
    }
    const it = await loadItemById(ctx.db.db, itemId, ctx.templates.findItem);
    if (!it) return;
    out.writeString(p.info.NickName ?? "");
    out.writeInt(it.TemplateID); out.writeInt(it.ItemID); out.writeInt(it.StrengthenLevel);
    out.writeInt(it.AttackCompose); out.writeInt(it.AgilityCompose); out.writeInt(it.LuckCompose); out.writeInt(it.DefendCompose);
    if (p.clientKind === "6600") { out.writeInt(0); out.writeInt(0); } // MagicAttack/MagicDefence — não implementado
    out.writeInt(it.ValidDate); out.writeBoolean(it.IsBinds); out.writeBoolean(it.IsJudge); out.writeBoolean(it.IsUsed);
    if (it.IsUsed) out.writeString(it.BeginDate.toISOString());
    out.writeInt(it.Hole1); out.writeInt(it.Hole2); out.writeInt(it.Hole3); out.writeInt(it.Hole4); out.writeInt(it.Hole5); out.writeInt(it.Hole6);
    out.writeString(it.template.Hole ?? ""); out.writeString(it.template.Pic ?? "");
    out.writeInt(it.StrengthenRefineryLevel);
    out.writeDateTime(ctx.now());
    out.writeByte(it.Hole5Level); out.writeInt(it.Hole5Exp); out.writeByte(it.Hole6Level); out.writeInt(it.Hole6Exp);
    if (p.clientKind === "6600") {
      out.writeBoolean(it.isGold);
      if (it.isGold) { out.writeInt(it.goldValidDate); out.writeDateTime(wireDate(it.goldBeginTime), true); }
      out.writeInt(0); // MagicLevel — o .cs 6600 nunca escreve isso (bug original); mandamos 0 pra não estourar EOF no cliente.
    }
    p.send(out);
  });
}
