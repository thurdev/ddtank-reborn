-- VIEW dbo.MemBership_UserRight_View (modified 2012-04-21T07:53:25.123)
--Author：keny  Date：2009-12-30  Description：查询用户权限
CREATE VIEW [dbo].[MemBership_UserRight_View]
AS
SELECT a.UserId,max(a.RightsId) as RightsId,a.AddTime as AddTime, b.ModuleName AS ModuleName, b.Description AS Url,b.ParModuleId as ModuleId
FROM Db_Membership.dbo.Mem_Right c INNER JOIN
      Db_Membership.dbo.Mem_Module b ON c.ModuleId = b.ModuleId INNER JOIN
      Db_Membership.dbo.Mem_UserRight a ON c.RightsId = a.RightsId
WHERE (b.ApplicationId = 3) group by a.userId,a.AddTime,b.ModuleName,b.Description,b.ParModuleId






GO
