-- SQL_STORED_PROCEDURE dbo.SP_LuckStar_Reward_Record_All (modified 2015-01-25T14:04:48.573)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_LuckStar_Reward_Record_All]
@MinUseNum int
AS  
 SELECT TOP 10 * FROM [dbo].[LuckStarRankInfo] WHERE [useStarNum] >= @MinUseNum ORDER BY [useStarNum] DESC

GO
