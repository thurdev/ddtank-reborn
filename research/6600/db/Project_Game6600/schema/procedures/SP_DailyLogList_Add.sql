-- SQL_STORED_PROCEDURE dbo.SP_DailyLogList_Add (modified 2015-01-25T14:04:48.533)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<防沉迷-身份验证:播入身份证>
-- =============================================
CREATE PROCEDURE [dbo].[SP_DailyLogList_Add]
@UserID int,
@UserAwardLog int,
@DayLog nvarchar(2000)

AS

declare @Count int

select @Count = IsNull(count(*),0) from DailyLogList  where UserID = @UserID

if @Count <> 0
begin
    return 1
end

set xact_abort on
begin tran
insert into DailyLogList([UserID],[UserAwardLog],[DayLog]) values(@UserID,@UserAwardLog,@DayLog)
if @@error <>0
begin
    rollback tran
    return @@error
end

commit tran
set xact_abort off
return 0

GO
