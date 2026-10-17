-- SQL_STORED_PROCEDURE dbo.SP_SubActive_All (modified 2015-01-25T14:04:48.677)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_SubActive_All]
AS  
 select *  from  [dbo].[Sub_Active_List] where IsOpen = 1

GO
