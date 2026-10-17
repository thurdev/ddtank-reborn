-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUserMatchInfo (modified 2015-01-25T14:04:48.617)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleUserMatchInfo]
		@UserID int
AS  
 select *  from  dbo.Sys_User_Match_Info where [UserID] = @UserID

GO
