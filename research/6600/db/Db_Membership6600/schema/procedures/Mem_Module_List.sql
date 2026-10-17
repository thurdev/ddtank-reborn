-- SQL_STORED_PROCEDURE dbo.Mem_Module_List (modified 2012-04-21T07:54:31.093)






/*
创建人：小危 创建时间:2008-12-30  修改人：小危 修改时间:2008-12-30
描述：读取模块
*/
CREATE     PROCEDURE [dbo].[Mem_Module_List]
@ApplicationName Varchar(20)
AS

   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

Select Id, ApplicationId, ModuleId, ModuleName, ParModuleId, AddTime, 
      Description From Mem_Module Where ApplicationId=@ApplicationId
 ORDER BY CAST(ModuleId AS Varchar(10))




GO
