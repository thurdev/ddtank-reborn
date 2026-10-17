-- VIEW dbo.Mem_Module_View (modified 2012-04-21T07:54:31.093)
CREATE VIEW dbo.Mem_Module_View
AS
SELECT Id, ApplicationId, ModuleId, ModuleName, ParModuleId, AddTime, 
      Description
FROM dbo.Mem_Module

GO
