-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaInviteUser_Delete (modified 2021-06-04T05:18:35.150)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：删除公会邀请用户信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaInviteUser_Delete]   
 @ID int, 
 @UserID int
AS

Update Consortia_Invite_Users set IsExist = 0 where [ID]=@ID and UserID=@UserID and IsExist=1 

if @@error<>0
begin
  return @@error
end

return 0










GO
