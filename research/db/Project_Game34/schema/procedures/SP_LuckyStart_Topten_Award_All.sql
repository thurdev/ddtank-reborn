-- SQL_STORED_PROCEDURE dbo.SP_LuckyStart_Topten_Award_All (modified 2022-01-27T10:57:34.183)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_LuckyStart_Topten_Award_All]
AS  
  Select * From dbo.LuckyStart_Topten_Award where [Type] > 10

GO
