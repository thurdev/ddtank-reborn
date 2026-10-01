-- SQL_SCALAR_FUNCTION dbo.VietnamTranslation (modified 2021-05-23T02:41:31.983)
--中文繁体语言包
CREATE   FUNCTION [dbo].[VietnamTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
begin
 declare @translated as nvarchar(200)


  select  @translated = 
	case @TranslationID
	when 'SP_Active_PullDown.Sender' then N'Quản lý hệ thống'
	when 'SP_Active_PullDown.Title' then N'Bạn nhận được phần thưởng hoạt động!'
	when 'SP_Active_PullDown.Content' then N'Bạn nhận được phần thưởng hoạt động!'
	when 'SP_Auction_Delete.Sender' then N'Trung tâm bán đấu giá'
	when 'SP_Auction_Delete.Title' then N'Hủy bán đấu giá!'
	when 'SP_Auction_Delete.Content' then N'Hủy bán đấu giá!'
	when 'SP_Auction_Scan.Sender' then N'Trung tâm bán đấu giá'
	when 'SP_Auction_Scan.Title' then N'Bán đấu giá thành công!'
	when 'SP_Auction_Scan.Content' then N'Bán đấu giá thành công!'
	when 'SP_Auction_Scan.Msg1' then N'Bán đấu giá quá hạn:    '
	when 'SP_Auction_Scan.Msg2' then N'Bạn bán đấu giá {0} đã quá hạn!!'
	when 'SP_Auction_Scan.Msg3' then N'Đấu giá thành công:    '
	when 'SP_Auction_Scan.Msg4' then N'Bạn đã đấu giá thành công <{0}> vật phẩm {1}, trả {2} điểm khoán!'
	when 'SP_Auction_Scan.Msg5' then N'Bán đấu giá thành công:    '
	when 'SP_Auction_Scan.Msg6' then N'{0} bán đấu giá đã được <{1}> mua đi, nhận được {2} điểm khoán!!'
	when 'SP_Auction_Update.Sender' then N'Trung tâm bán đấu giá'
	when 'SP_Auction_Update.Title' then N'Bán đấu giá trả về!'
	when 'SP_Auction_Update.Content' then N'Bán đấu giá trả về!'
	when 'SP_Auction_Update.Msg1' then N'Đấu giá thất bại:    '
	when 'SP_Auction_Update.Msg2' then N'Giá {0} bạn đưa ra thấp hơn <{1}>, trả lại {2} điểm khoán!'
	when 'SP_Auction_Update.Msg3' then N'Đấu giá thành công:    '
	when 'SP_Auction_Update.Msg4' then N'Bạn đấu giá <{0}> thành công vật phẩm {1}, chi trả {2} điểm khoán!'
	when 'SP_Auction_Update.Msg5' then N'Bán đấu giá thành công:    '
	when 'SP_Auction_Update.Msg6' then N'{0} bán đấu giá đã được <{1}> mua đi, nhận được {2} điểm khoán!'
	when 'SP_Auction_Update.Msg7' then N'<{1}> mua thành công vật phẩm {0} với giá {2} điểm khoán. Phí giao dịch là 10%! '
	when 'SP_Consortia_Add.Duty1' then N'Hội trưởng'
	when 'SP_Consortia_Add.Duty2' then N'Phó hội trưởng'
	when 'SP_Consortia_Add.Duty3' then N'Quan viên'
	when 'SP_Consortia_Add.Duty4' then N'Tinh anh'
	when 'SP_Consortia_Add.Duty5' then N'Hội viên'
	when 'SP_ConsortiaAlly_Add.Msg1' then N'<{0}> tuyên chiến, thù địch!'
	when 'SP_ConsortiaAlly_Add.Msg2' then N' Chuyển sang trạng thái thù địch với <{0}>!'
	when 'SP_ConsortiaAlly_Add.Msg3' then N'<{0}> Thoát liên minh, trung lập!'
	when 'SP_ConsortiaAlly_Add.Msg4' then N' Cùng <{0}> bỏ liên minh, trung lập!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg1' then N'Đã liên minh với <{0}>!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg2' then N'<{0}> và bạn liên minh thành công!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg3' then N'Đã nghị hòa với <{0}>!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg4' then N'<{0}> đã nghị hòa với guild bạn!'
	when 'SP_Mail_Delete.Msg1' then N'Thư trả về:   '
	when 'SP_Mail_Delete.Msg2' then N'Thư bạn gửi cho <{0}> bị đối phương từ chối hay vượt quá thời gian cho phép nên bị trả về!'
	when 'SP_Mail_PaymentCancel.Msg1' then N'hư trả về:    '
	when 'SP_Mail_PaymentCancel.Msg2' then N'Thư bạn gửi cho <{0}> bị đối phương từ chối hay vượt quá thời gian cho phép nên bị trả về!'
	when 'SP_Mail_Scan.Sender' then N'Trung tâm bán đấu giá'
	when 'SP_Mail_Scan.Title' then N'Bán đấu giá thành công!'
	when 'SP_Mail_Scan.Content' then N'Bán đấu giá thành công!'
	when 'SP_Mail_Scan.Msg1' then N'Thư trả về:    '
	when 'SP_Mail_Scan.Msg2' then N'Thư bạn gửi cho <{0}> bị đối phương từ chối hay vượt quá thời gian cho phép nên bị trả về!'
	when 'SP_Mail_Update.Msg1' then N'Thư trả tiền:    '
	when 'SP_Mail_Update.Msg2' then N'Bạn gửi cho <{0}> {1} đã được thanh toán, số tiền là {2} điểm khoán!'
	when 'SP_Consortia_Riches_Add.Msg1' then N' Member {0} tặng {1} điểm tài sản!' 
	when 'SP_Mail_Update.Msg3' then N'đính kèm:1、xu{0}'
	when 'SP_Admin_SendAllItem.Sender' then N' Quản lý '
	else @TranslationID
	end
 
 return @translated
end 

























GO
