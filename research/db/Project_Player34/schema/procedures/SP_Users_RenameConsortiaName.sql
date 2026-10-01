-- SQL_STORED_PROCEDURE dbo.SP_Users_RenameConsortiaName (modified 2021-06-04T05:18:36.443)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<合服信息：重命名公会>
-- =============================================
CREATE Procedure [dbo].[SP_Users_RenameConsortiaName]
@UserName nvarchar(200),
@NickName nvarchar(200),
@ConsortiaName nvarchar(200)

as

declare @ConsortiaID int 
declare @count int
declare @Rename bit

if @NickName is null or @ConsortiaName is null
begin
    return 1
end

select @Rename=Rename,@ConsortiaID=ConsortiaID from Consortia where IsExist=1 and ChairmanName=@NickName

if @Rename=0
begin
    return 3
end

select @count=count(*) from Consortia where ConsortiaName=@ConsortiaName

if @count<>0
begin
    return 4
end

select @count=count(*) from Rename_Consortia where ConsortiaName=@ConsortiaName

if @count<>0
begin
    return 5
end

set xact_abort on
begin tran

     INSERT INTO Rename_Consortia(ConsortiaID, ConsortiaName,NickName,[Date],IsExist) 
     VALUES(@ConsortiaID, @ConsortiaName, @NickName , getdate(), 1) 

if @@error <> 0
begin
  rollback tran
  return @@error
end

    UPDATE Consortia Set  Rename=0 WHERE ConsortiaID=@ConsortiaID 

if @@error <> 0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0










GO
