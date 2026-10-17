-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUserRank (modified 2015-01-25T14:04:48.613)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleUserRank]
		@UserID int
AS  
 select *  from  dbo.Sys_User_Rank where [UserID] = @UserID

GO
