-- VIEW dbo.ddt_BpCount_view (modified 2012-04-21T07:53:24.670)
CREATE VIEW [dbo].[ddt_BpCount_view]
AS
SELECT     UserID AS id, UserName, NickName,GP
FROM         Db_Tank.dbo.Sys_Users_Detail


GO
