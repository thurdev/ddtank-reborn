-- SQL_STORED_PROCEDURE dbo.SP_Fight_Rate (modified 2015-01-25T14:04:48.553)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<变装:获取当前服务器中变装设置>
-- =============================================
CREATE procedure [dbo].[SP_Fight_Rate]
@serverId int
as
begin
 select * from Fight_Rate where ServerID = @serverId
end

GO
