-- SQL_STORED_PROCEDURE dbo.SP_Consortia_TaskAward (modified 2021-06-04T01:29:17.840)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
Create  PROCEDURE [dbo].[SP_Consortia_TaskAward]
@lv int
AS  
  Select * From Consortia_TaskAward where Lv = @lv




GO
