-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_UserSex (modified 2012-04-21T07:54:31.123)

CREATE  PROCEDURE Mem_UserInfo_UserSex 
@ApplicationName              nvarchar(256),
@UserName                     nvarchar(256),
@UserSex                      bit output
AS
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
返回用户性别
*/
   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

   /*返回用户编号*/
   DECLARE @UserId  INT   
   SELECT @UserId=UserId FROM Mem_Users WHERE UserName = @UserName AND ApplicationId=@ApplicationId



   /*得到当前用户名*/
   SELECT @UserSex=UserSex  FROM  Mem_UserInfo WHERE ApplicationId=@ApplicationId AND  UserId=@UserId
   
   


GO
