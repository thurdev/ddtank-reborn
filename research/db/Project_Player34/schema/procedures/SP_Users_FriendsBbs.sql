-- SQL_STORED_PROCEDURE dbo.SP_Users_FriendsBbs (modified 2021-06-04T05:18:36.127)







-- =============================================
-- Author:		<XiaoV>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户信息-好友信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_FriendsBbs]
@SearchUserName Nvarchar(4000) AS  
 Begin  
   /*第一步:将好友切割成一个临时表*/   
   Create Table #TempUser(UserName NVarchar(100))
   Insert Into #TempUser
           Select Value From dbo.split(@SearchUserName,',')
   

   /*第二步：获取好友的是否加入我们游戏中*/
   Select A.UserName,IsNull(B.UserId,0) As UserId,B.NickName From #TempUser  A
            Left Outer Join dbo.Sys_Users_Detail B
                 On A.UserName=B.UserName


   /*第三步:清除临时表*/
   Drop Table #TempUser
 End











GO
