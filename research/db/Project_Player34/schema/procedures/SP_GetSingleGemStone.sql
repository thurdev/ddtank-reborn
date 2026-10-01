-- SQL_STORED_PROCEDURE dbo.SP_GetSingleGemStone (modified 2022-02-20T07:41:39.250)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_GetSingleGemStone]
@ID int
AS  
 select * from [dbo].[Sys_User_Gemstone] where [UserID] = @ID --and IsExit = 1

GO
