-- SQL_STORED_PROCEDURE dbo.Mem_Users_Accede (modified 2012-04-21T07:54:31.110)


CREATE  PROCEDURE [dbo].[Mem_Users_Accede]
@ApplicationName Varchar(256),
@UserName Varchar(256),
@Password Varchar(256),
@UserId INT OUTPUT
AS

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
用户名+密码登陆
*/
   /*定义站点Id*/
   DECLARE @ApplicationId INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName
 

   /*得到用户编号*/
   Select Top 1 @UserId=A.UserId FROM Mem_Users A LEFT OUTER JOIN Mem_UserInfo B
         ON A.ApplicationId=B.ApplicationId  AND A.UserId=B.UserId
         Where A.ApplicationId=@ApplicationId
               And A.UserName=@UserName 
               And B.Password=@Password   

 

   /*更新用户登陆次数*/
   if ISNULL(@UserId,'')<>''
      BEGIN
        /*修改最后登陆时间*/
        UPDATE Mem_UserInfo SET LastLoginDate=getdate() WHERE ApplicationId=@ApplicationId AND UserId=@UserId
        /*修改登陆次数*/
        UPDATE Mem_Users Set LoginTime=LoginTime+1 Where ApplicationId=@ApplicationId And UserId=@UserId
      END

GO
