-- SQL_STORED_PROCEDURE dbo.SP_Users_RenameConsortia (modified 2022-01-08T01:29:17.343)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<合服信息：修改用户昵称>
-- =============================================
CREATE Procedure [dbo].[SP_Users_RenameConsortia]
@ConsortiaID nvarchar(200),
@NickName nvarchar(200),
@NewNickName nvarchar(200)

as

declare @ChairmanID int 
declare @count int
if @NickName is null or @NewNickName is null
begin
    return 1
end

select @ChairmanID = isnull(UserID,0)from Sys_Users_Detail where NickName=@NickName

if @ChairmanID = 0
begin
    return 2
end

select @count=count(*) from Consortia where  ConsortiaName=@NewNickName and ChairmanID = @ChairmanID

if @count<>0
begin
    return 4
end

select @count=count(*) from Rename_Consortia where ConsortiaName=@NewNickName

if @count<>0
begin
    return 5
end

set xact_abort on
begin tran
INSERT INTO [dbo].[Rename_Consortia]
           ([ConsortiaID]
           ,[ConsortiaName]
           ,[NickName]
           ,[Date]
           ,[IsExist])
     VALUES
           (@ConsortiaID
           ,@NewNickName
           ,@NickName
           ,getdate()
           ,0)
if @@error <> 0
begin
  rollback tran
  return @@error
end

    UPDATE Consortia Set  ConsortiaName = @NewNickName WHERE ChairmanID = @ChairmanID

if @@error <> 0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0

GO
