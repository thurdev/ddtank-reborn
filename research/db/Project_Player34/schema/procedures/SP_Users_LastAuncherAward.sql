-- SQL_STORED_PROCEDURE dbo.SP_Users_LastAuncherAward (modified 2021-06-04T05:18:36.190)




-- =============================================
-- Author:		<Peter>
-- ALTER  date: <2010-2-23>
-- Description:	<用户信息：更新用户登陆器最后领奖时间>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_LastAuncherAward] 
@UserID int
AS
Update Sys_Users_Detail Set LastAuncherAward=GetDate()  Where UserId=@UserId









GO
