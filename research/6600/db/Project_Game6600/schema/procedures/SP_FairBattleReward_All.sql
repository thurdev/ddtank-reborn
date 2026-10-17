-- SQL_STORED_PROCEDURE dbo.SP_FairBattleReward_All (modified 2015-01-25T14:04:48.557)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<炼化表:显示全部炼化>
-- =============================================
CREATE Procedure [dbo].[SP_FairBattleReward_All]
as
select * from Fair_Battle_Reward_Temp

GO
