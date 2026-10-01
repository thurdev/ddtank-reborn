-- SQL_STORED_PROCEDURE dbo.SP_Mail_PaymentCancel (modified 2021-06-04T05:18:35.547)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：取消付费邮件>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Mail_PaymentCancel]
 @userID int,
 @mailID int,
 @SenderID int out
AS  

--declare @SenderID int
declare @Sender nvarchar(100)
declare @ReceiverID int
declare @Receiver nvarchar(100)
declare @Title nvarchar(1000)
declare @Annex1 nvarchar(100)
declare @Annex2 nvarchar(100)
declare @Type int
declare @Remark nvarchar(200)
declare @money int
declare @Annex3 nvarchar(100)
declare @Annex4 nvarchar(100)
declare @Annex5 nvarchar(100)

select @SenderID=SenderID,@Sender=Sender,@ReceiverID=ReceiverID,@Receiver=Receiver,@Title=Title,@Annex1=Annex1,@Annex2=Annex2,@Type=Type,@money=[money],@Annex3=Annex3,@Annex4=Annex4,@Annex5=Annex5
from User_Messages where [ID]=@mailID and ReceiverID=@userID and IsExist=1

if @Type is null or @Type<100
begin
  return 2
end

if @money = 0
begin
  return 3
end

set xact_abort on 
begin tran

  declare @NewTitle nvarchar(200)
  declare @NewContent nvarchar(200)
  set @NewTitle = dbo.GetTranslation('SP_Mail_PaymentCancel.Msg1')+@Title--'退回信函:    '+@Title
  set @NewContent =dbo.GetTranslation('SP_Mail_PaymentCancel.Msg2')--'您寄往<'+ @Receiver +'>的邮件由于对方拒绝接收或超过邮件保留期而被退回!'
  set @NewContent = REPLACE(@NewContent,'{0}',@Receiver)
  set @Remark = 'Gold:0,Money:0,Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5
  INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark, Annex3, Annex4, Annex5) 
       VALUES( @ReceiverID, @Receiver, @SenderID, @Sender, @NewTitle, @NewContent, getdate(), 0, 0, 0, 0, @Annex1, @Annex2, 0, 0, 1,7,@Remark, @Annex3, @Annex4, @Annex5)

  if @@error <>0
  begin 
    rollback tran
    return @@error
  end




UPDATE User_Messages Set Annex1='', Annex2='', Annex3='', Annex4='', Annex5='',IsExist=0 where ID=@mailID and ReceiverID=@userID

if @@error <>0
begin 
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0








GO
