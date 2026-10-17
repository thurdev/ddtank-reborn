-- SQL_STORED_PROCEDURE dbo.SP_Rate (modified 2015-01-25T14:04:48.710)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<服务器信息：功勋、财富、经验倍率配置>
-- =============================================
CREATE  procedure [dbo].[SP_Rate]
@serverId int
as
begin
 select * from Rate where ServerID = @serverId
end

GO
