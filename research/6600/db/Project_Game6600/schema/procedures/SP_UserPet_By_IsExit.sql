-- SQL_STORED_PROCEDURE dbo.SP_UserPet_By_IsExit (modified 2015-01-25T14:04:48.290)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UserPet_By_IsExit]
@UserID int
AS  
 select * from [dbo].[Sys_Users_Pet] where UserID = @UserID --and IsExit = 1

GO
