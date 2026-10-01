-- SQL_STORED_PROCEDURE dbo.SP_Get_User_AchievementData (modified 2021-06-04T05:18:35.380)




-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_User_AchievementData] 
	-- Add the parameters for the stored procedure here
@UserID int
AS
BEGIN

    -- Insert statements for procedure here
	SELECT * from AchievementData Where UserID=@UserID
END





GO
