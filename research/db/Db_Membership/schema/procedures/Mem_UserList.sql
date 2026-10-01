-- SQL_STORED_PROCEDURE dbo.Mem_UserList (modified 2012-04-21T07:54:31.077)

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：用户权限列表
*/
CREATE  PROCEDURE Mem_UserList 
@ApplicationName Varchar(20)
AS

   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

SELECT A.UserId,A.UserName,C.RoleName FROM Mem_Users A
   Left Outer Join Mem_UsersInRoles B
     On A.UserId=B.UserId
   Left Outer Join Mem_Roles C
      On B.RoleId=C.RoleId
   Where A.ApplicationId=@ApplicationId And C.ApplicationId=@ApplicationId
GO
