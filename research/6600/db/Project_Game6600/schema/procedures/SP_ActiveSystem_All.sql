-- SQL_STORED_PROCEDURE dbo.SP_ActiveSystem_All (modified 2015-01-25T14:04:48.450)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ActiveSystem_All]
AS  
  Select * From dbo.Sys_Active_System_Data order by [totalScore] desc

GO
