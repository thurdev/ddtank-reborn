-- SQL_STORED_PROCEDURE dbo.SP_Users_Friends_Delete (modified 2021-06-04T05:18:36.113)




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
