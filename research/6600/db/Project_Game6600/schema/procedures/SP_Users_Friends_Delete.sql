-- SQL_STORED_PROCEDURE dbo.SP_Users_Friends_Delete (modified 2015-01-25T14:04:48.330)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：删除一个好友>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Friends_Delete]
 @ID int,
 @UserID int
 AS  
   begin 
     update Sys_Users_Friends set IsExist = 0 where FriendID=@ID and UserID=@UserID
   end

GO
