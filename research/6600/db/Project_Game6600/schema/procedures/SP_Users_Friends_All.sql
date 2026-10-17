-- SQL_STORED_PROCEDURE dbo.SP_Users_Friends_All (modified 2015-01-25T14:04:48.330)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Friends_All]
 @UserID int
 AS  
   begin 
     select  FriendID,Relation from Sys_Users_Friends  
where UserID = @UserID and IsExist = 1
   end

GO
