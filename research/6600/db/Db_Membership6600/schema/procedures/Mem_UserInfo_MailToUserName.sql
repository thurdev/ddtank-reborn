-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_MailToUserName (modified 2012-04-21T07:54:31.110)






CREATE       PROCEDURE Mem_UserInfo_MailToUserName
@EMAIL                        nvarchar(256),
@ApplicationName              nvarchar(256),
@UserName                     nvarchar(256),
@Total                        int OUTPUT
AS
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述:获取当前最大值生成是有序的
*/
   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

   /*返回用户编号*/
   DECLARE @UserId  INT   
   SELECT @UserId=UserId FROM Mem_Users WHERE ApplicationId=@ApplicationId AND UserName=@UserName


   SELECT @Total=Count(*)  FROM  Mem_UserInfo WHERE ApplicationId=@ApplicationId AND  Email=@EMAIL AND UserId=@UserId


    





GO
