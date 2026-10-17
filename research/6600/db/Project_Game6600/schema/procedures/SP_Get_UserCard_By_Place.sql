-- SQL_STORED_PROCEDURE dbo.SP_Get_UserCard_By_Place (modified 2015-01-25T14:04:48.627)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_UserCard_By_Place]
@Place int
AS  
 select * from [dbo].[Sys_Users_Card] where Place = @Place and IsExit = 1 and [Type] = -1

GO
