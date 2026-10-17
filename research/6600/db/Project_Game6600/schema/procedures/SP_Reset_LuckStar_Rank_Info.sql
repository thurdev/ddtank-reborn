-- SQL_STORED_PROCEDURE dbo.SP_Reset_LuckStar_Rank_Info (modified 2015-01-25T14:04:48.700)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Reset_LuckStar_Rank_Info]
AS
BEGIN
UPDATE [dbo].[LuckStarRankInfo]
   SET [useStarNum] = 0
 WHERE [UserID] > 0 
END

GO
