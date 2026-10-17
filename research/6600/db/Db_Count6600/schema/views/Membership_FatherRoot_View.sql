-- VIEW dbo.Membership_FatherRoot_View (modified 2012-04-21T07:53:25.123)
--Author： keny  Date：2009-12-31   Description：查找所有GM后台所有父节点

CREATE VIEW [dbo].[Membership_FatherRoot_View]
AS
SELECT *
FROM Db_Membership.dbo.Mem_Module
WHERE (ParModuleId IN
          (SELECT moduleid
         FROM Membership_FatherNode_View))




GO
