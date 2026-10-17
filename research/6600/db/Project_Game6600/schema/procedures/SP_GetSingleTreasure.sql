-- SQL_STORED_PROCEDURE dbo.SP_GetSingleTreasure (modified 2015-01-25T14:04:48.620)
-- =============================================
-- Author:		<Justin>
-- ALTER  date: <2010-1-8>
-- Description:	根据Key获取服务器配置
-- =============================================
CREATE Procedure [dbo].[SP_GetSingleTreasure]
	@UserID int
AS
BEGIN
	select * from [dbo].[Sys_User_Treasure] where UserID = @UserID
END

GO
