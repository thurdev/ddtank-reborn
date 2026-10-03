/** LanguageMgr.GetTranslation for the keys Tank.Request uses (vendor/DDTank41/Tank.Request/bin/Languages/Language-vn.txt; last definition wins). Translated to pt-BR; see data/i18n/pt-BR/server-language.txt for the full server string set. */
const VN: Record<string, string> = {
  "Tank.Request.Login.Fail1": "Falha no login.",
  "Tank.Request.Login.Fail2": "Falha no login..",
  "Tank.Request.Login.Success": "Login realizado com sucesso.",
  "Tank.Request.VisualizeRegister.Fail1": "Falha ao registrar a aparência.",
  "Tank.Request.VisualizeRegister.Success": "Aparência registrada com sucesso.",
  "Tank.Request.VisualizeRegister.Long": "Nickname muito longo.",
  "Tank.Request.VisualizeRegister.Illegalcharacters": "O nome do personagem contém caracteres inválidos.",
  "BaseInterface.LoginAndUpdate.Fail": "Falha na ativação.",
  "BaseInterface.LoginAndUpdate.Try": "Sessão expirada, faça login novamente.",
  "PlayerBussiness.RegisterPlayer.Msg2": "Este nome de jogador já existe.",
  "PlayerBussiness.RegisterPlayer.Msg3": "Este nome de jogador já existe.",
  "Tank.Request.NickNameCheck.Long": "Máximo de 14 caracteres!",
  "Tank.Request.NickNameCheck.Right": "Parabéns! Este nome de personagem pode ser usado.",
  "Tank.Request.NickNameCheck.Exist": "Este nome de jogador já existe",
  "Tank.Request.ConsortiaNameCheck.Long": "Nome do clã muito longo.",
  "Tank.Request.ConsortiaNameCheck.Right": "Você pode usar este nome de clã.",
  "Tank.Request.ConsortiaNameCheck.Exist": "Este nome de clã já existe.",
  "Tank.Request.ConsortiaName.Illegalcharacters": "O nome do clã contém caracteres inválidos.",
  "Tank.Request.RenameNick.Success": "Nickname alterado com sucesso.",
  "Tank.Request.RenameNick.Fail1": "Falha ao alterar o nickname.",
  "Tank.Request.RenameNick.Fail2": "Falha ao alterar o nickname..",
  "Tank.Request.RenameConsortiaName.Success": "Nome do clã alterado com sucesso.",
  "Tank.Request.RenameConsortiaName.Fail1": "Falha ao alterar o nome do clã.",
  "Tank.Request.RenameConsortiaName.Fail2": "Falha ao alterar o nome do clã.",
  "ManageBussiness.Forbid1": "Conta banida até {0} de {1} de {2}, {3}:{4}.",
};

export function t(key: string, ...args: unknown[]): string {
  const s = VN[key] ?? key;
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}
