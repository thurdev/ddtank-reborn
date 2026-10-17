-- SQL_STORED_PROCEDURE dbo.Sp_Count_Login (modified 2012-04-21T07:53:24.247)




-- Author:	xiaov
-- ALTER  date: 2008.12.4
-- Description:	记录用户登陆数据
CREATE  PROCEDURE  [dbo].[Sp_Count_Login] 
@LoginDateTime DateTime,
@ApplicationId Int,
@SubId Int
 AS
  /*第一步:获取登陆记录*/
  Select 
A.SubId,A.LoginDateTime,A.IsSex,A.OwnAddress,A.OwnNet,A.OnSite,A.UserId,A.IpAddress,IsNull(B.UserName,'') As UserName ,IsNull(B.UserOther,' ') As UserOther From Count_Login A Left Outer Join Count_Register B
     On A.UserId=B.UserId
  Where Convert(Char(10), LoginDateTime,120)=@LoginDateTime 
        And A.ApplicationId=@ApplicationId
        And A.SubId =@SubId
order by  LoginDateTime


GO
