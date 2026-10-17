-- SQL_STORED_PROCEDURE dbo.SP_Users_LastAward (modified 2015-01-25T14:04:48.297)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新用户最后领奖时间>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_LastAward] 
@UserID int,
@Type int
AS
--Update Sys_Users_Detail Set LastAward=GetDate()  Where UserId=@UserId
if @Type=0
  begin
    Update Sys_Users_Detail Set LastAward=GetDate()  Where UserId=@UserId
  end
else
  begin
    Update Sys_Users_Detail Set LastGetEgg=GetDate()  Where UserId=@UserId
  end

GO
