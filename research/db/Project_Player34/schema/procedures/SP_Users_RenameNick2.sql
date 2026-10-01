-- SQL_STORED_PROCEDURE dbo.SP_Users_RenameNick2 (modified 2021-10-04T21:27:53.417)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<合服信息：修改用户昵称>
-- =============================================
CREATE Procedure [dbo].[SP_Users_RenameNick2]
@UserName nvarchar(200),
@NickName nvarchar(200),
@NewNickName nvarchar(200)

as

declare @UserID int 
declare @count int
declare @Rename bit

if @NickName is null or @NewNickName is null
begin
    return 1
end

select @UserID=isnull(UserID,0),@Rename=Rename from Sys_Users_Detail where UserName=@UserName and NickName=@NickName

if @UserID=0
begin
    return 2
end

select @count=count(*) from Sys_Users_Detail where  NickName=@NewNickName

if @count<>0
begin
    return 4
end

select @count=count(*) from Rename_Nick where NickName=@NewNickName

if @count<>0
begin
    return 5
end

set xact_abort on
begin tran

     INSERT INTO Rename_Nick(UserId, UserName,NickName,[Date],IsExist,OldNickName) 
     VALUES(@UserID, @UserName, @NewNickName , getdate(), 0,@NickName) 

if @@error <> 0
begin
  rollback tran
  return @@error
end

    UPDATE Sys_Users_Detail Set  Rename=0, NickName =@NewNickName WHERE UserId=@UserId 
	UPDATE Sys_Users_Detail Set  SpouseName=@NewNickName WHERE SpouseID=@UserId
    UPDATE Consortia Set  ChairmanName = @NewNickName WHERE ChairmanID=@UserId
	UPDATE Consortia_Users Set  UserName = @NewNickName WHERE UserID=@UserId

if @@error <> 0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0










GO
