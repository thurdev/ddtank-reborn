-- SQL_STORED_PROCEDURE dbo.SP_GetSingleLabyrinth (modified 2015-01-25T14:04:48.620)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleLabyrinth]
@ID int
AS  
 select * from [dbo].[Sys_Users_Labyrinth] where [UserID] = @ID

GO
