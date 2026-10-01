-- SQL_STORED_PROCEDURE dbo.SP_Get_UserCard_By_ID (modified 2021-06-04T05:18:35.403)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_UserCard_By_ID]
@UserID int
AS  
 select * from [dbo].[Sys_Users_Card] where UserID = @UserID-- and IsExit = 1 --and Type = -1
 








GO
