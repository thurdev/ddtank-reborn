-- SQL_STORED_PROCEDURE dbo.SP_GetSingleActiveSystem (modified 2021-06-04T05:35:59.807)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
Create  PROCEDURE [dbo].[SP_GetSingleActiveSystem]
		@UserID int
AS  
 select *  from  dbo.Sys_Active_System_Data where [UserID] = @UserID

GO
