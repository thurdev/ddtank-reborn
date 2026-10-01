-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUserLeague (modified 2022-05-09T05:46:03)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleUserLeague]
@UserID int
AS  
 select * from [dbo].Sys_Users_League WHERE UserID = @UserID

GO
