-- SQL_STORED_PROCEDURE dbo.SP_Users_Friends_Good (modified 2021-06-04T05:18:36.120)





-- =============================================
-- Author:		<XiaoV>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户信息-好友信息，除去黑名单,主要提供给外网用>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Friends_Good]
@UserName Nvarchar(200) AS  
 Begin 
   /*第一步：获取当前用户的UserId*/
   Declare @UserId Int
   Set @UserId=0
   Select @UserId=IsNull(UserID,0) From Sys_Users_Detail Where UserName=@UserName
   
   /*第二步：获取当前用户的好友*/  
   If @UserId>0 
      Begin
        Select B.UserName From Sys_Users_Friends  A
               Left Outer Join Sys_Users_Detail B On A.FriendID=B.UserID
                    Where A.UserID = @UserId And A.IsExist = 1 And B.UserName!=''
      End    
 End







GO
