-- SQL_STORED_PROCEDURE dbo.SP_GetSingleActiveSystem (modified 2015-01-25T14:04:48.623)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleActiveSystem]
		@UserID int
AS  
 select *  from  dbo.Sys_Active_System_Data where [UserID] = @UserID

GO
