-- SQL_STORED_PROCEDURE dbo.SP_Sys_Insert_TestID (modified 2015-01-25T14:04:48.830)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：自动注册帐号>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Insert_TestID]
@startID int,
@endID int
as

declare @temp varchar(50)

while @startID <= @endID
begin

set @temp = 'test' + cast(@startID as varchar(20))
exec SP_Users_Active @startID,0,0,0,0,10000000,10000000,',,,,,,',',,,,,,',1111111111,1,1,0,0,@temp,@temp,1,'','',''

exec SP_Users_Register @temp,@temp,@temp,7001,3101,6101,5101,7002,3201,6201,5201,'','','','',1

set @startID = @startID + 1

end

GO
