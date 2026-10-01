-- SQL_STORED_PROCEDURE dbo.SP_Get_UserPet_By_ID (modified 2021-06-04T05:18:35.417)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_UserPet_By_ID]
@UserID int
AS  
 select * from [dbo].[Sys_Users_Pet] where UserID = @UserID and Place > -1 --and IsExit = 1




GO
