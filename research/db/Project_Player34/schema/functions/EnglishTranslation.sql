-- SQL_SCALAR_FUNCTION dbo.EnglishTranslation (modified 2021-05-23T02:41:31.983)
--英文语言包
CREATE   FUNCTION [dbo].[EnglishTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
begin
 declare @translated as nvarchar(200)

select @translated = 
	case @TranslationID
	when 'SP_Active_PullDown.Sender' then N'System Administrator'
	when 'SP_Active_PullDown.Title' then N'You obtain activity reward!'
	when 'SP_Active_PullDown.Content' then N'You obtain activity reward!'
	when 'SP_Auction_Delete.Sender' then N'Auction Center'
	when 'SP_Auction_Delete.Title' then N'Withdraw auction!'
	when 'SP_Auction_Delete.Content' then N'Withdraw auction!'
	when 'SP_Auction_Scan.Sender' then N'Auction Center'
	when 'SP_Auction_Scan.Title' then N'Auction successfully!'
	when 'SP_Auction_Scan.Content' then N'Auction successfully!'
	when 'SP_Auction_Scan.Msg1' then N'Auction expired:'
	when 'SP_Auction_Scan.Msg2' then N'Your auction item {0} has passed it management time!!'
	when 'SP_Auction_Scan.Msg3' then N'Bid successfully:'
	when 'SP_Auction_Scan.Msg4' then N'You successful bid the item {1} auction by <{0}> with {2} point value!'
	when 'SP_Auction_Scan.Msg5' then N'Auction successfully:'
	when 'SP_Auction_Scan.Msg6' then N'Your auction item {0} has been buyout by <{1}>. Payment is {2} point value. You receive {4} point value after deducted the transaction fee of {3} point value.'
	when 'SP_Auction_Update.Sender' then N'Auction Center'
	when 'SP_Auction_Update.Title' then N'Return to auction!'
	when 'SP_Auction_Update.Content' then N'Return to auction!'
	when 'SP_Auction_Update.Msg1' then N'Bid failed:'
	when 'SP_Auction_Update.Msg2' then N'Your bid price {0} has been exceeded by the bid price of <{1}>. Return {2} point value!'
	when 'SP_Auction_Update.Msg3' then N'Bid successfully:'
	when 'SP_Auction_Update.Msg4' then N'You successfully obtain the auction item {1} by <{0}>. Pay {2} point value!'
	when 'SP_Auction_Update.Msg5' then N'Auction successfully:'
	when 'SP_Auction_Update.Msg6' then N'Your auction item {0} has been buyout by <{1}>. Payment is {2} point value. You receive {4} point value after deducted the transaction fee of {3} point value.'
	when 'SP_Consortia_Add.Duty1' then N'President'
	when 'SP_Consortia_Add.Duty2' then N'Vice President'
	when 'SP_Consortia_Add.Duty3' then N'Officer'
	when 'SP_Consortia_Add.Duty4' then N'Committee'
	when 'SP_Consortia_Add.Duty5' then N'Member'
	when 'SP_ConsortiaAlly_Add.Msg1' then N'<{0}> declares war to you. A hostile condition is formed!'
	when 'SP_ConsortiaAlly_Add.Msg2' then N'You declare war to <{0}>. A hostile condition is formed!'
	when 'SP_ConsortiaAlly_Add.Msg3' then N'<{0}> relieves the treaty of alliance with you. You are in mutual neutrality now!'
	when 'SP_ConsortiaAlly_Add.Msg4' then N'You relieves the treaty of alliance with <{0}>. You are in mutual neutrality now!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg1' then N'You successfully form an alliance with <{0}>!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg2' then N'<{0}> successfully form an alliance with you!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg3' then N'You successfully peace negotiate with <{0}>. You are in mutual neutrality now!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg4' then N'<{0}> successfully peace negotiate with you. You are in mutual neutrality now!'
	when 'SP_Mail_Delete.Msg1' then N'Message return:'
	when 'SP_Mail_Delete.Msg2' then N'The message you sent to <{0}> were rejected or exceeded the retaining time!'
	when 'SP_Mail_PaymentCancel.Msg1' then N'Message return:'
	when 'SP_Mail_PaymentCancel.Msg2' then N'The message you sent to <{0}> were rejected or exceeded the retaining time!'
	when 'SP_Mail_Scan.Sender' then N'Auction Center'
	when 'SP_Mail_Scan.Title' then N'Auction successfully!'
	when 'SP_Mail_Scan.Content' then N'Auction successfully!'
	when 'SP_Mail_Scan.Msg1' then N'Message return:'
	when 'SP_Mail_Scan.Msg2' then N'The message you sent to <{0}> were rejected or exceeded the retaining time!'
	when 'SP_Mail_Update.Msg1' then N'Pay message:'
	when 'SP_Mail_Update.Msg2' then N'The {1} you sent to <{0}> were paid. Payment amount is {2} point value!'
	when 'SP_Consortia_Riches_Add.Msg1' then N'Alliance member {0} contributes {1} points as alliance wealth.'
	when 'SP_Mail_Update.Msg3' then N'Attachment is: 1. {0} point value.'
	when 'SP_Admin_SendAllItem.Sender' then N'System Administrator'
	else @TranslationID
	end
 return @translated
end 























GO
