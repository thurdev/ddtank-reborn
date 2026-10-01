-- SQL_STORED_PROCEDURE dbo.Mem_Right_List (modified 2012-04-21T07:54:31.110)

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：权限列表 
*/
CREATE  PROCEDURE Mem_Right_List 
@ApplicationName Varchar(256),
@ModuleId Int
AS
   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

   /*得到权限值*/
   Select ModuleId,RightsId,RightsName From Mem_Right  Where ApplicationId=@ApplicationId And ModuleId=@ModuleId

GO
