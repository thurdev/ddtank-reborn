-- SQL_STORED_PROCEDURE dbo.SP_Active_All (modified 2015-01-25T14:04:48.413)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Active_All]
AS  
  Select * From Active order by ActiveId desc

GO
