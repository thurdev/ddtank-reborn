-- SQL_STORED_PROCEDURE dbo.SP_GetSingleUserCard (modified 2021-06-04T05:18:35.450)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetSingleUserCard]
		@UserID int
AS  
 select *  from  dbo.Sys_Users_Card where [UserID] = @UserID AND Place != -1





GO
