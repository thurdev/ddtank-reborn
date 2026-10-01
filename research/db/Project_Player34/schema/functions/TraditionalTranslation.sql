-- SQL_SCALAR_FUNCTION dbo.TraditionalTranslation (modified 2021-05-23T02:41:31.983)
--中文繁体语言包
CREATE   FUNCTION [dbo].[TraditionalTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
begin
 declare @translated as nvarchar(200)


 select  @translated = 
	case @TranslationID
	when 'SP_Active_PullDown.Sender' then N'系統管理員'
	when 'SP_Active_PullDown.Title' then N'您獲得活動獎品!'
	when 'SP_Active_PullDown.Content' then N'您獲得活動獎品!'
	when 'SP_Auction_Delete.Sender' then N'拍賣中心'
	when 'SP_Auction_Delete.Title' then N'撤銷拍賣!'
	when 'SP_Auction_Delete.Content' then N'撤銷拍賣!'
	when 'SP_Auction_Scan.Sender' then N'拍賣中心'
	when 'SP_Auction_Scan.Title' then N'拍賣成功!'
	when 'SP_Auction_Scan.Content' then N'拍賣成功!'
	when 'SP_Auction_Scan.Msg1' then N'拍賣過期:    '
	when 'SP_Auction_Scan.Msg2' then N'您所拍賣的  {0}  超過保管時間!!'
	when 'SP_Auction_Scan.Msg3' then N'競標成功:    '
	when 'SP_Auction_Scan.Msg4' then N'您成功競標<{0}>拍賣的  {1}  , 支付{2}點券!'
	when 'SP_Auction_Scan.Msg5' then N'拍賣成功:    '
	when 'SP_Auction_Scan.Msg6' then N'您所拍賣的  {0}  被<{1}>購買 , 交易金額為{2}點券! 其中扣除交易費用{3}點券 , 您一共獲得{4}點券!'
	when 'SP_Auction_Scan.Msg7' then N'您所拍賣的  {0}  被<{1}>購買 , 交易金額為{2}點券! 您一共獲得{4}點券!'
	when 'SP_Auction_Update.Sender' then N'拍賣中心'
	when 'SP_Auction_Update.Title' then N'拍賣返回!'
	when 'SP_Auction_Update.Content' then N'拍賣返回!'
	when 'SP_Auction_Update.Msg1' then N'競標失敗:    '
	when 'SP_Auction_Update.Msg2' then N'您競標的  {0}  價格被 <{1}> 超出，返回{2}點券!'
	when 'SP_Auction_Update.Msg3' then N'競標成功:    '
	when 'SP_Auction_Update.Msg4' then N'您成功競標<{0}>拍賣的  {1}  ,支付{2}點券!'
	when 'SP_Auction_Update.Msg5' then N'拍賣成功:    '
	when 'SP_Auction_Update.Msg6' then N'您所拍賣的  {0}  被 <{1}> 購買 , 交易金額為{2}點券! 其中扣除交易費用{3}點券 , 您一共獲得{4}點券!'
	when 'SP_Auction_Update.Msg7' then N'您所拍賣的  {0}  被<{1}>購買 , 交易金額為{2}點券! 您一共獲得{4}點券!'
	when 'SP_Consortia_Add.Duty1' then N'會長'
	when 'SP_Consortia_Add.Duty2' then N'副會長'
	when 'SP_Consortia_Add.Duty3' then N'官員'
	when 'SP_Consortia_Add.Duty4' then N'精英'
	when 'SP_Consortia_Add.Duty5' then N'會員'
	when 'SP_ConsortiaAlly_Add.Msg1' then N'<{0}> 向你們宣戰，成為敵對狀態!'
	when 'SP_ConsortiaAlly_Add.Msg2' then N'你們向 <{0}> 宣戰，成為敵對狀態!'
	when 'SP_ConsortiaAlly_Add.Msg3' then N'<{0}> 與你們解除盟約，相互中立!'
	when 'SP_ConsortiaAlly_Add.Msg4' then N'你們與 <{0}> 解除盟約，相互中立!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg1' then N'你們與 <{0}> 成功結盟!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg2' then N'<{0}> 與你們成功結盟!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg3' then N'你們與 <{0}> 議和成功，相互中立!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg4' then N'<{0}> 與你們議和成功，相互中立!'
	when 'SP_Mail_Delete.Msg1' then N'退回信函:   '
	when 'SP_Mail_Delete.Msg2' then N'您寄往<{0}>的郵件由於對方拒絕接收或超過郵件保留期而被退回!'
	when 'SP_Mail_PaymentCancel.Msg1' then N'退回信函:    '
	when 'SP_Mail_PaymentCancel.Msg2' then N'您寄往<{0}>的郵件由於對方拒絕接收或超過郵件保留期而被退回!'
	when 'SP_Mail_Scan.Sender' then N'拍賣中心'
	when 'SP_Mail_Scan.Title' then N'拍賣成功!'
	when 'SP_Mail_Scan.Content' then N'拍賣成功!'
	when 'SP_Mail_Scan.Msg1' then N'退回信函:    '
	when 'SP_Mail_Scan.Msg2' then N'您寄往<{0}>的郵件由於對方拒絕接收或超過郵件保留期而被退回!'
	when 'SP_Mail_Update.Msg1' then N'付款信函:    '
	when 'SP_Mail_Update.Msg2' then N'您寄往<{0}>的  {1}  已經付費，付款金額為{2}點券!'
	when 'SP_Consortia_Riches_Add.Msg1' then N'公會成員{0}捐獻{1}點公會財富!'

	when 'SP_Mail_Update.Msg3' then N'附件為:1、點券{0}'
	when 'SP_Admin_SendAllItem.Sender' then N'系統管理員'
	else @TranslationID
	end
 return @translated
end 
























GO
