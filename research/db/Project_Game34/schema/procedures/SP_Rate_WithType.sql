-- SQL_STORED_PROCEDURE dbo.SP_Rate_WithType (modified 2021-06-04T01:29:18.453)




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
