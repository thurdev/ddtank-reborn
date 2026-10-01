-- SQL_STORED_PROCEDURE dbo.SP_Get_EliteScorePlayers (modified 2021-06-04T05:18:35.343)




-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_EliteScorePlayers] 
	-- Add the parameters for the stored procedure here
AS
BEGIN

    -- Insert statements for procedure here
	SELECT UserID, NickName, EliteScore, Grade from Sys_Users_Detail where EliteScore > 1 order by EliteScore DESC
END







GO
