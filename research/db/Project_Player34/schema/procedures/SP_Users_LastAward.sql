-- SQL_STORED_PROCEDURE dbo.SP_Users_LastAward (modified 2021-06-04T05:18:36.197)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新用户最后领奖时间>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_LastAward] 
@UserID int,
@Type int
AS
Update Sys_Users_Detail Set LastAward=GetDate()  Where UserId=@UserId




GO
