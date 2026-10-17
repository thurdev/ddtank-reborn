-- SQL_STORED_PROCEDURE dbo.SP_Rate_WithType (modified 2015-01-25T14:04:48.707)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<服务器信息：读取一种倍率>
-- =============================================
CREATE procedure [dbo].[SP_Rate_WithType]
@serverId int,
@type int
as

begin
 select * from Rate where ServerID = @serverId and Type = @type
end

GO
