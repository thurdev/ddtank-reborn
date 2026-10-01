-- SQL_STORED_PROCEDURE dbo.Mem_Roles_List (modified 2012-04-21T07:54:31.123)

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：权限列表
*/
CREATE PROCEDURE [dbo].[Mem_Roles_List]
@ApplicationName Varchar(20)
AS
   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName


  SELECT RoleId, RoleName, Description FROM Mem_Roles Where ApplicationId=@ApplicationId

GO
