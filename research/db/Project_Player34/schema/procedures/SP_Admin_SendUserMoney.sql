-- SQL_STORED_PROCEDURE dbo.SP_Admin_SendUserMoney (modified 2021-06-04T05:18:34.677)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<后台用的物品赠送:旧版，已废>
-- =============================================
CREATE Procedure [dbo].[SP_Admin_SendUserMoney]
--信箱
 @ID int output, 
 @SenderID int, 
 @Sender nvarchar(100), 
 @ReceiverID int, 
 @Receiver nvarchar(100), 
 @Title nvarchar(1000), 
 @Content nvarchar(4000), 
 @SendTime DateTime, 
 @IsRead bit, 
 @IsDelR bit, 
 @IfDelS bit, 
 @IsDelete bit, 
 @Annex1 nvarchar(100), 
 @Annex2 nvarchar(100), 
 @Gold int, 
 @Money int,
 @IsExist bit
AS  
declare @NickName varchar(50)
declare @Remark nvarchar(200)

set @NickName=''
select @NickName=NickName from  Sys_Users_Detail where UserID = @ReceiverID
if @NickName = ''
begin
  return 2
end


set xact_abort on 
begin tran
 
 set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:'+@Annex1+'Annex2:'+@Annex2
 INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, @IsExist,51,@Remark)

if @@error<>0
begin  
  rollback tran
  return @@error
end

commit tran
set xact_abort off
return 0


GO
