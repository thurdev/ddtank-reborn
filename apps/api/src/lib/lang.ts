/** LanguageMgr.GetTranslation for the keys Tank.Request uses (vendor/DDTank41/Tank.Request/bin/Languages/Language-vn.txt; last definition wins). */
const VN: Record<string, string> = {
  "Tank.Request.Login.Fail1": "Đăng nhập thất bại.",
  "Tank.Request.Login.Fail2": "Đăng nhập thất bại..",
  "Tank.Request.Login.Success": "Đăng nhập thành công.",
  "Tank.Request.VisualizeRegister.Fail1": "Đăng ký hình tượng thất bại.",
  "Tank.Request.VisualizeRegister.Success": "Đăng ký hình tượng thành công.",
  "Tank.Request.VisualizeRegister.Long": "Biệt danh người dùng quá dài.",
  "Tank.Request.VisualizeRegister.Illegalcharacters": "Tên nhân vật chứa ký tự không hợp lệ.",
  "BaseInterface.LoginAndUpdate.Fail": "Kích hoạt thất bại.",
  "BaseInterface.LoginAndUpdate.Try": "Thời gian đăng nhập hết hiệu lực, hãy đăng nhập lại.",
  "PlayerBussiness.RegisterPlayer.Msg2": "Tên người chơi đã tồn tại.",
  "PlayerBussiness.RegisterPlayer.Msg3": "Tên người chơi đã tồn tại.",
  "Tank.Request.NickNameCheck.Long": "Tối đa nhập 14 ký tự!",
  "Tank.Request.NickNameCheck.Right": "Chúc mừng! tên nhân vật có thể sử dụng.",
  "Tank.Request.NickNameCheck.Exist": "Tên người chơi đã tồn tại",
  "Tank.Request.ConsortiaNameCheck.Long": "Tên bang hội quá dài.",
  "Tank.Request.ConsortiaNameCheck.Right": "Bạn có thể sử dụng tên bang hội này。",
  "Tank.Request.ConsortiaNameCheck.Exist": "Tên bang hội đã tồn tại.",
  "Tank.Request.ConsortiaName.Illegalcharacters": "Tên bang hội chứa các ký tự không hợp lệ.",
  "Tank.Request.RenameNick.Success": "thay đổi biệt danh người sử dụng thành công.",
  "Tank.Request.RenameNick.Fail1": "thay đổi tên hiệu thất bại.",
  "Tank.Request.RenameNick.Fail2": "thay đổi tên hiệu thất bại ..",
  "Tank.Request.RenameConsortiaName.Success": "Đổi tên bang hội thành công.",
  "Tank.Request.RenameConsortiaName.Fail1": "thay đổi tên Guild thất bại.",
  "Tank.Request.RenameConsortiaName.Fail2": "thay đổi tên Guild thất bại.",
  "ManageBussiness.Forbid1": "Tài khoản bị khóa đến năm {0} tháng {1} ngày {2}, {3} giờ {4} phút.",
};

export function t(key: string, ...args: unknown[]): string {
  const s = VN[key] ?? key;
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}
