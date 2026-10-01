-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUsersExtra (modified 2021-06-04T05:18:35.467)








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
