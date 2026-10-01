-- SQL_STORED_PROCEDURE dbo.SP_Luckstar_Activity_Rank_All (modified 2022-01-27T11:09:59.740)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Luckstar_Activity_Rank_All]
AS  
 SELECT * FROM [dbo].[LuckStarRankInfo] WHERE [useStarNum] > 0 ORDER BY [useStarNum] DESC


GO
