-- SQL_STORED_PROCEDURE dbo.SP_DailyRecordInfo_Add (modified 2021-06-04T05:18:35.287)





-- =============================================
-- Author:		<bTh>
-- ALTER  date: <2017-09-14>
-- Description:	<[SP_DailyRecordInfo_Add]>
-- =============================================
CREATE PROCEDURE [dbo].[SP_DailyRecordInfo_Add]
@UserID int,
@Type int,
@Value nvarchar(500)
AS
declare @count int
select @Count = IsNull(count(*),0) FROM DailyRecordInfo WHERE UserID = @UserID AND [Type] = @Type

if @Count <> 0
begin
    DELETE FROM DailyRecordInfo WHERE UserID = @UserID AND [Type] = @Type
end

set xact_abort on
begin tran
insert into DailyRecordInfo([UserID],[Type],[Value]) values(@UserID,@Type,@Value)
if @@error <>0
begin
    rollback tran
    return @@error
end

commit tran
set xact_abort off
return 0










GO
