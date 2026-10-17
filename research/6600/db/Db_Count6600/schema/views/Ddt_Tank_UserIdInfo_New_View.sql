-- VIEW dbo.Ddt_Tank_UserIdInfo_New_View (modified 2012-04-21T07:53:24.810)
----author:Jason  Description: 修改用户昵称、战斗场数  Date:2009-12-15
CREATE  VIEW [dbo].[Ddt_Tank_UserIdInfo_New_View]
AS
SELECT TOP 0 UserID, UserName, NickName, Total, Win
FROM Db_Tank.dbo.Sys_Users_Detail




GO
