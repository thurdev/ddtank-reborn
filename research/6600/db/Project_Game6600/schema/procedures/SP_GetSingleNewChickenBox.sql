-- SQL_STORED_PROCEDURE dbo.SP_GetSingleNewChickenBox (modified 2015-01-25T14:04:48.620)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleNewChickenBox]
		@UserID int
AS  
 select *  from  dbo.New_ChickenBox_Data where [UserID] = @UserID

GO
