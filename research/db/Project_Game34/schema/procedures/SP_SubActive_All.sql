-- SQL_STORED_PROCEDURE dbo.SP_SubActive_All (modified 2022-08-17T21:00:07.953)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_SubActive_All]
AS  
 select *  from  [dbo].[Sub_Active_List] where IsOpen = 1

GO
