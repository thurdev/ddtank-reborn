-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUserMatchInfo (modified 2021-06-04T05:18:35.453)






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
