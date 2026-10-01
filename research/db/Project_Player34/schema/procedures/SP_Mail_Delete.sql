-- SQL_STORED_PROCEDURE dbo.SP_Mail_Delete (modified 2021-06-04T05:18:35.537)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：删除一条用户邮件>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Mail_Delete]
 @ID int,
 @UserID int,
 @SenderID int output
 AS  

set @SenderID=0
declare @Annex1 int
declare @Annex2 int
declare @Type int
declare @Sender nvarchar(100)
declare @ReceiverID int
declare @Receiver nvarchar(100)
declare @Title nvarchar(200)
declare @Money int
declare @Annex3 int
declare @Annex4 int
declare @Annex5 int

select @SenderID=SenderID,@Sender=Sender,@ReceiverID=ReceiverID,@Receiver=Receiver,@Title=Title,@Money=[money],@Annex1=isnull(Annex1,0),@Annex2=isnull(Annex2,0),@Type=Type ,@Annex3=isnull(Annex3,0),@Annex4=isnull(Annex4,0),@Annex5=isnull(Annex5,0)
from User_Messages where ID=@ID and ReceiverID=@UserID and IsExist=1

if @Type is null or @Type=0
begin
   return 3
end

set xact_abort on 
begin tran

if @Type<100 or @Money=0
begin

set @SenderID=0
DELETE FROM [dbo].[Sys_Users_Goods]
       WHERE ItemID in (@Annex1, @Annex2, @Annex3, @Annex4, @Annex5)
     
if @@error <> 0
begin
  rollback tran
  return 1
end

end
else
begin 

  declare @NewTitle nvarchar(200)
  declare @NewContent nvarchar(200)
  declare @Remark nvarchar(200)
  set @NewTitle = dbo.GetTranslation('SP_Mail_Delete.Msg1')+@Title--'退回信函:    '+@Title
  set @NewContent =dbo.GetTranslation('SP_Mail_Delete.Msg2')--'您寄往<'+ @Receiver +'>的邮件由于 对方拒绝接收或超过邮件保留期而被退回!'
  set @NewContent = REPLACE(@NewContent,'{0}',@Receiver)
  set @Remark = 'Gold:0,Money:0,Annex1:'+cast(@Annex1 as nvarchar(20))+',Annex2:'+cast(@Annex2 as nvarchar(20))+',Annex3:'+cast(@Annex3 as nvarchar(20))+',Annex4:'+cast(@Annex4 as nvarchar(20))+',Annex5:'+cast(@Annex5 as nvarchar(20))
  INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5) 
       VALUES( @ReceiverID, @Receiver, @SenderID, @Sender, @NewTitle, @NewContent, getdate(), 0, 0, 0, 0, @Annex1, @Annex2, 0, 0, 1,7, @Remark,@Annex3, @Annex4, @Annex5)

if @@error <> 0
begin
  rollback tran
  return 1
end

end


update User_Messages set IsExist = 0,SendTime = getdate() where ID=@ID and ReceiverID=@UserID

if @@error <> 0
begin
  rollback tran
  return 2
end

commit tran
set xact_abort off

return 0









GO
