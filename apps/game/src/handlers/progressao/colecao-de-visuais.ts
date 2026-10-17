/**
 * Aba no jogo: Coleção de visuais (`AvatarCollection`) — ativar uma fantasia que o jogador já possui dentro
 * de um conjunto; ao completar metade/tudo do conjunto, ganha bônus temporário de atributo.
 * Pacote: 402 AVATAR_COLLECTION (sub 3 ativar, sub 4 renovar).
 * C#: `AvatarCollectionHandler.cs:17-99` (ativar) e `:100-192` (renovar, desativado no C# original) em
 * `vendor/DDTank41/Game.Server/Packets/Client`.
 * Como testar: `apps/game/test/progression.test.ts`. Manual: `docs/features/totem.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/**
 * 402/3 AVATAR_COLLECTION ACTIVE (AvatarCollectionHandler.cs:17-99).
 * Como lê esse código (cada variável): `setId` = ClothGroupTemplateInfo.ID / ClothPropertyTemplateInfo.ID (o
 * mesmo "ID" nas duas tabelas = 1 conjunto de roupa); `templateId` = item de equipamento que o jogador já tem
 * (prova de posse: `equipBag.getItemByTemplateID`); `sex` = sexo do item dentro do conjunto; `group` = linha
 * de ClothGroupTemplateInfo (Cost em Gold); `prop` = linha de ClothPropertyTemplateInfo (dona do `ID` do
 * conjunto, usada como `AvatarID` da coleção salva); `set` = UserAvatarCollectionRow do jogador para esse
 * `AvatarID` (cria uma nova se ainda não tiver); `already` = true se o item já tinha sido ativado nesse
 * conjunto (AddItem falha).
 */
function avatarCollectActive(ctx: ServerContext, p: GamePlayer, setId: number, templateId: number, sex: number): void {
  if (!p.equipBag.getItemByTemplateID(0, templateId)) return p.sendMessage(0, "Você não possui este item.");
  const group = ctx.templates.getClothGroup(setId, templateId, sex);
  if (!group) return p.sendMessage(0, "Esta fantasia não existe.");
  const prop = ctx.templates.clothProperties.get(group.ID);
  if (!prop) return p.sendMessage(0, "O conjunto que contém esta fantasia não existe.");
  if (p.info.Gold < group.Cost) return p.sendMessage(0, "Ouro insuficiente.");
  p.removeGold(group.Cost);
  let set = p.getAvatarCollect(group.ID);
  const already = set?.items.some((i) => i.TemplateID === templateId) ?? false;
  if (already) {
    p.addGold(group.Cost);
    return p.sendMessage(0, "Erro ao ativar a fantasia.");
  }
  if (!set) {
    set = { ID: 0, UserID: p.id, AvatarID: group.ID, Sex: prop.Sex, IsActive: false, TimeStart: ctx.now(), TimeEnd: ctx.now(), items: [], dirty: true };
    p.avatarCollect.push(set);
  }
  set.items.push({ TemplateID: templateId, Sex: group.Sex });
  set.dirty = true;
  const total = ctx.templates.countClothGroupWithID(set.AvatarID);
  const half = Math.floor(total / 2);
  let halfJustReached = false;
  if (set.items.length === half && !set.IsActive) {
    // UserAvatarCollectionInfo.ActiveAvatar(10) (SqlDataProvider/Data/UserAvatarCollectionInfo.cs:191-210)
    set.IsActive = true;
    set.TimeEnd = new Date(ctx.now().getTime() + 10 * 86_400_000);
    halfJustReached = true;
  }
  const refreshStats = set.items.length === half || set.items.length === total;
  if (halfJustReached) p.send(Out.avatarCollectDelay(set.AvatarID, set.Sex, set.TimeEnd));
  p.send(Out.avatarCollectActive(setId, templateId, sex));
  if (refreshStats) p.updatePlayerProperties();
  p.sendMessage(0, "Ativado com sucesso!");
}

/** 402 AVATAR_COLLECTION: byte sub-command (AvatarCollectionHandler.cs:15). */
export function avatarCollection(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readByte();
  if (sub === 3) {
    const setId = pkt.readInt(), templateId = pkt.readInt(), sex = pkt.readInt();
    avatarCollectActive(ctx, p, setId, templateId, sex);
  } else if (sub === 4) {
    // AvatarCollectionHandler.cs:100-192 (renovar): a lógica real está comentada no C# original ("Tinh nang
    // chua mo" = recurso ainda não disponível) — mantemos o mesmo recado em vez de inventar um custo de
    // renovação.
    pkt.readInt(); pkt.readInt();
    p.sendMessage(0, "Função ainda não disponível.");
  }
}
