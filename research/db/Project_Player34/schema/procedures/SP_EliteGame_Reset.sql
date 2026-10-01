-- SQL_STORED_PROCEDURE dbo.SP_EliteGame_Reset (modified 2021-06-04T05:18:35.320)




-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_EliteGame_Reset] 
	-- Add the parameters for the stored procedure here
@EliteScore int
AS
BEGIN

    -- Insert statements for procedure here
	update Sys_Users_Detail SET EliteScore = @EliteScore--where EliteScore != @EliteScore
END







GO
