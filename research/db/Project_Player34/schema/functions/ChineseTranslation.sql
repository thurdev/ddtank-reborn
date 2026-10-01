-- SQL_SCALAR_FUNCTION dbo.ChineseTranslation (modified 2021-05-23T02:41:31.983)
--中文简体语言包
CREATE   FUNCTION [dbo].[ChineseTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
begin
 declare @translated as nvarchar(200)


 select  @translated = 
	case @TranslationID
	when 'SP_Active_PullDown.Sender' then N'系统管理员'
	when 'SP_Active_PullDown.Title' then N'您获得活动奖品!'
	when 'SP_Active_PullDown.Content' then N'您获得活动奖品!'
	when 'SP_Auction_Delete.Sender' then N'拍卖中心'
	when 'SP_Auction_Delete.Title' then N'撤消拍卖!'
	when 'SP_Auction_Delete.Content' then N'撤消拍卖!'
	when 'SP_Auction_Scan.Sender' then N'拍卖中心'
	when 'SP_Auction_Scan.Title' then N'拍卖成功!'
	when 'SP_Auction_Scan.Content' then N'拍卖成功!'
	when 'SP_Auction_Scan.Msg1' then N'拍卖过期:    '
	when 'SP_Auction_Scan.Msg2' then N'您所拍卖的  {0}  超过保管时间!!'
	when 'SP_Auction_Scan.Msg3' then N'竞标成功:    '
	when 'SP_Auction_Scan.Msg4' then N'您成功竞标<{0}>拍卖的  {1}  , 支付{2}点券!'
	when 'SP_Auction_Scan.Msg5' then N'拍卖成功:    '
	when 'SP_Auction_Scan.Msg6' then N'您所拍卖的  {0}  被<{1}>购买 , 交易金额为{2}点券!, 其中扣除交易费用{3}点券 , 您一共获得{4}点券!'
	when 'SP_Auction_Scan.Msg7' then N'您所拍卖的  {0}  被<{1}>购买 , 交易金额为{2}点券!, 您一共获得{4}点券!'
	when 'SP_Auction_Update.Sender' then N'拍卖中心'
	when 'SP_Auction_Update.Title' then N'拍卖返回!'
	when 'SP_Auction_Update.Content' then N'拍卖返回!'
	when 'SP_Auction_Update.Msg1' then N'竞标失败:    '
	when 'SP_Auction_Update.Msg2' then N'您竞标的  {0}  价格被 <{1}> 超出，返回{2}点券!'
	when 'SP_Auction_Update.Msg3' then N'竞标成功:    '
	when 'SP_Auction_Update.Msg4' then N'您成功竞标<{0}>拍卖的  {1}  ,支付{2}点券!'
	when 'SP_Auction_Update.Msg5' then N'拍卖成功:    '
	when 'SP_Auction_Update.Msg6' then N'您所拍卖的  {0}  被 <{1}> 购买 , 交易金额为{2}点券, 其中扣除交易费用{3}点券 , 您一共获得{4}点券!'
	when 'SP_Auction_Update.Msg7' then N'您所拍卖的  {0}  被 <{1}> 购买 , 交易金额为{2}点券,  您一共获得{4}点券!'
	when 'SP_Consortia_Add.Duty1' then N'会长'
	when 'SP_Consortia_Add.Duty2' then N'副会长'
	when 'SP_Consortia_Add.Duty3' then N'官员'
	when 'SP_Consortia_Add.Duty4' then N'精英'
	when 'SP_Consortia_Add.Duty5' then N'会员'
	when 'SP_ConsortiaAlly_Add.Msg1' then N'<{0}> 向你们宣战，成为敌对状态!'
	when 'SP_ConsortiaAlly_Add.Msg2' then N'你们向 <{0}> 宣战，成为敌对状态!'
	when 'SP_ConsortiaAlly_Add.Msg3' then N'<{0}> 与你们解除盟约，相互中立!'
	when 'SP_ConsortiaAlly_Add.Msg4' then N'你们与 <{0}> 解除盟约，相互中立!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg1' then N'你们与 <{0}> 成功结盟!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg2' then N'<{0}> 与你们成功结盟!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg3' then N'你们与 <{0}> 议和成功，相互中立!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg4' then N'<{0}> 与你们议和成功，相互中立!'
	when 'SP_Mail_Delete.Msg1' then N'退回信函:   '
	when 'SP_Mail_Delete.Msg2' then N'您寄往<{0}>的邮件由于对方拒绝接收或超过邮件保留期而被退回!'
	when 'SP_Mail_PaymentCancel.Msg1' then N'退回信函:    '
	when 'SP_Mail_PaymentCancel.Msg2' then N'您寄往<{0}>的邮件由于对方拒绝接收或超过邮件保留期而被退回!'
	when 'SP_Mail_Scan.Sender' then N'拍卖中心'
	when 'SP_Mail_Scan.Title' then N'拍卖成功!'
	when 'SP_Mail_Scan.Content' then N'拍卖成功!'
	when 'SP_Mail_Scan.Msg1' then N'退回信函:    '
	when 'SP_Mail_Scan.Msg2' then N'您寄往<{0}>的邮件由于对方拒绝接收或超过邮件保留期而被退回!'
	when 'SP_Mail_Update.Msg1' then N'付款信函:    '
	when 'SP_Mail_Update.Msg2' then N'您寄往<{0}>的  {1}  已经付费，付款金额为{2}点券!'
	when 'SP_Consortia_Riches_Add.Msg1' then N'公会成员{0}捐献{1}点公会财富!'
	when 'SP_Mail_Update.Msg3' then N'附件为:1、点券{0}'
	when 'SP_Admin_SendAllItem.Sender' then N'系统管理员'
	else @TranslationID
	end
 
 return @translated
end 






















GO
