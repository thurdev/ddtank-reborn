-- SQL_STORED_PROCEDURE dbo.SP_SubActiveCondition_All (modified 2022-08-17T21:00:07.960)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_SubActiveCondition_All]
		@ActiveID int
AS  
 select *  from  [dbo].[Sub_Active_Condition] where [ActiveID] = @ActiveID

GO
