-- SQL_STORED_PROCEDURE dbo.SP_Fight_Rate (modified 2021-06-04T01:29:17.970)




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
