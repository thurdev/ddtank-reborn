-- SQL_STORED_PROCEDURE dbo.SP_GetSingleTreasureData (modified 2015-01-25T14:04:48.617)
-- =============================================
-- Author:		<Justin>
-- ALTER  date: <2010-1-8>
-- Description:	根据Key获取服务器配置
-- =============================================
CREATE Procedure [dbo].[SP_GetSingleTreasureData]
	@UserID int
AS
BEGIN
	select * from [dbo].[Treasure_Data] where UserID = @UserID and IsExit = 1
END

GO
