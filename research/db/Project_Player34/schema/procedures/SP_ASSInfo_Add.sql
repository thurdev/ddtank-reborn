-- SQL_STORED_PROCEDURE dbo.SP_ASSInfo_Add (modified 2021-06-04T05:18:34.693)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<防沉迷-身份验证:播入身份证>
-- =============================================
CREATE PROCEDURE [dbo].[SP_ASSInfo_Add]
@UserID int,
@Name nvarchar(20),
@IDNumber nvarchar(20),
@State int
AS

declare @Count int

select @Count = IsNull(count(*),0) from AASInfo  where UserID = @UserID

if @Count <> 0
begin
    return 1
end

set xact_abort on
begin tran
insert into AASInfo(UserID,[Name],IDNumber,State) values(@UserID,@Name,@IDNumber,@State)
if @@error <>0
begin
    rollback tran
    return @@error
end

commit tran
set xact_abort off
return 0









GO
