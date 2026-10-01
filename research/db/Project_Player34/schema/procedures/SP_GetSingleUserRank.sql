-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUserRank (modified 2021-06-04T05:18:35.460)





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
