-- SQL_STORED_PROCEDURE dbo.SP_Active_Award_All (modified 2022-01-26T06:10:00.647)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<显示活动表:全部记录表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Active_Award_All]
AS  
  Select * From Active_Award

GO
