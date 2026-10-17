-- VIEW dbo.Membership_FatherNode_View (modified 2012-04-21T07:53:25.123)
--Author：keny  Date：2009-12-30  Description：查询用户权限的所有父节点

CREATE VIEW [dbo].[Membership_FatherNode_View]
AS
SELECT Id, ModuleName, ModuleId
FROM Db_Membership.dbo.Mem_Module
WHERE (ApplicationId = 3) AND (ParModuleId = 0)



GO
