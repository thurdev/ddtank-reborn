-- SQL_SCALAR_FUNCTION dbo.TraditionalTranslation (modified 2021-05-23T02:40:28.767)
--中文繁体语言包
CREATE   FUNCTION [dbo].[TraditionalTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
begin
 declare @translated as nvarchar(200)


 select  @translated = 
	case @TranslationID
	when 'SP_Active_PullDown.Sender' then N'Administrador do Sistema'
	when 'SP_Active_PullDown.Title' then N'Você obteve recompensas do sistema!'
	when 'SP_Active_PullDown.Content' then N'Você obteve recompensas do sistema!'
	when 'SP_Auction_Delete.Sender' then N'Centro do Leilão'
	when 'SP_Auction_Delete.Title' then N'Item removido do leilão!'
	when 'SP_Auction_Delete.Content' then N'Item removido do leilão!'
	when 'SP_Auction_Scan.Sender' then N'Centro do Leilão'
	when 'SP_Auction_Scan.Title' then N'Venda completa!'
	when 'SP_Auction_Scan.Content' then N'Venda completa!'
	when 'SP_Auction_Scan.Msg1' then N'Venda expirada:'
	when 'SP_Auction_Scan.Msg2' then N'Seu item de leilão {0} passou do tempo de validade!'
	when 'SP_Auction_Scan.Msg3' then N'Compra sucedida:'
	when 'SP_Auction_Scan.Msg4' then N'Você comprou com sucesso o item {1} do leilão do jogador <{0}> e pagou {2} de cupons!'
	when 'SP_Auction_Scan.Msg5' then N'Leilão com sucesso:'
	when 'SP_Auction_Scan.Msg6' then N'Seu item do leilão {0} foi comprado por <{1}>. O pagamento foi de {2} cupons. Você recebeu {4} cupons depois de deduzir a taxa de transação de {3} cupons.'
	when 'SP_Auction_Update.Sender' then N'Centro do Leilão'
	when 'SP_Auction_Update.Title' then N'Retornado para o leilão!'
	when 'SP_Auction_Update.Content' then N'Retornado para o leilão!'
	when 'SP_Auction_Update.Msg1' then N'Falha na compra:'
	when 'SP_Auction_Update.Msg2' then N'Seu preço de oferta {0} foi excedido pelo preço de oferta de <{1}>. Retornou {2} cupons!'
	when 'SP_Auction_Update.Msg3' then N'Compra sucedida:'
	when 'SP_Auction_Update.Msg4' then N'Você obteve com sucesso o item do leilão {1} por <{0}> cupons. Pagou {2} de cupons!'
	when 'SP_Auction_Update.Msg5' then N'Leilão sucedido:'
	when 'SP_Auction_Update.Msg6' then N'Seu item de leilão {0} foi comprado por <{1}> cupons. O pagamento é {2} cupons. Você recebe o valor de {4} cupons depois de deduzir a taxa de transação dos {3} cupons. '
	when 'SP_Consortia_Add.Duty1' then N'Presidente'
	when 'SP_Consortia_Add.Duty2' then N'Vice Presidente'
	when 'SP_Consortia_Add.Duty3' then N'Comandante'
	when 'SP_Consortia_Add.Duty4' then N'Delegação'
	when 'SP_Consortia_Add.Duty5' then N'Membro'
	when 'SP_ConsortiaAlly_Add.Msg1' then N'<{0}> declarou guerra com você. Uma condição hostil é formada!'
	when 'SP_ConsortiaAlly_Add.Msg2' then N'Você declarou guerra com <{0}>. Uma condição hostil é formada!'
	when 'SP_ConsortiaAlly_Add.Msg3' then N'<{0}> aliviou o tratado de aliança com você. Você está em neutralidade mútua agora!'
	when 'SP_ConsortiaAlly_Add.Msg4' then N'Você aliviou o tratado de aliança com <{0}>. Você está em neutralidade mútua agora!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg1' then N'Você formou uma aliança com sucesso com o(a) <{0}>!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg2' then N'<{0}> formou com sucesso uma aliança com você!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg3' then N'Você negociou com sucesso com o(a) <{0}>. Você está em neutralidade mútua agora!'
	when 'SP_ConsortiaApplyAlly_Pass.Msg4' then N'<{0}> fez as pazes com sucesso negociando com você. Você está em neutralidade mútua agora!'
	when 'SP_Mail_Delete.Msg1' then N'Mensagem retornada:'
	when 'SP_Mail_Delete.Msg2' then N'A mensagem que você enviou para <{0}> foi rejeitada ou excedeu o tempo limite!'
	when 'SP_Mail_PaymentCancel.Msg1' then N'Mensagem retornada:'
	when 'SP_Mail_PaymentCancel.Msg2' then N'A mensagem que você enviou para <{0}> foi rejeitada ou excedeu o tempo limite!'
	when 'SP_Mail_Scan.Sender' then N'Centro do Leilão'
	when 'SP_Mail_Scan.Title' then N'Compra aprovada!'
	when 'SP_Mail_Scan.Content' then N'Compra aprovada!'
	when 'SP_Mail_Scan.Msg1' then N'Mensagem retornada:'
	when 'SP_Mail_Scan.Msg2' then N'A mensagem que você enviou para <{0}> foi rejeitada ou excedeu o tempo limite!'
	when 'SP_Mail_Update.Msg1' then N'Mensagem de Pagamento:'
	when 'SP_Mail_Update.Msg2' then N'O item {1} que você enviou para <{0}> foi pago. O valor do pagamento foi de {2} cupons!'
	when 'SP_Consortia_Riches_Add.Msg1' then N'O Membro da Aliança {0} contribuiu com {1} pontos de riquezas.'
	when 'SP_Mail_Update.Msg3' then N'Anexo: 1. {0} cupons.'
	when 'SP_Admin_SendAllItem.Sender' then N'Administrador do Sistema'
	else @TranslationID
	end
 return @translated
end 
























GO
