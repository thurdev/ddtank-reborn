-- SQL_STORED_PROCEDURE dbo.SP_ActivitySystemItem_All (modified 2022-01-26T04:29:56.523)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ActivitySystemItem_All]
AS  
  Select * From dbo.Activity_System_Item

GO
