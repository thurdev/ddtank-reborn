-- SQL_STORED_PROCEDURE dbo.SP_DiceLevelAward_All (modified 2015-01-25T14:04:48.530)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_DiceLevelAward_All]
AS  
  Select * From dbo.Dice_Level_Award

GO
