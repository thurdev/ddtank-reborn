-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUsersExtra (modified 2015-01-25T14:04:48.613)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleUsersExtra]
		@UserID int
AS  
 select *  from  dbo.Sys_Users_Extra where [UserID] = @UserID

GO
