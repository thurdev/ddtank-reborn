-- SQL_STORED_PROCEDURE dbo.SP_Dispose_Marry_Room_Info (modified 2021-06-04T05:18:35.310)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚房间:将过期的结婚房间清除>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Dispose_Marry_Room_Info] 
@ID int
AS

set xact_abort on
begin tran

update Marry_Room_Info set isExist=0 where ID=@ID
if @@error<>0
begin
  rollback tran
  return @@error
end

declare @GroomID int
declare @BrideID int
select  @GroomID=GroomID,@BrideID=BrideID from Marry_Room_Info  where ID=@ID

update sys_users_detail set IsCreatedMarryRoom=0, SelfMarryRoomID=0 where UserID=@GroomID or UserID=@BrideID
if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0








GO
