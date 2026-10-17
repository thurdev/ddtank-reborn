-- VIEW dbo.Ddt_Tank_UserIdInfo_View (modified 2012-04-21T07:53:24.810)
CREATE VIEW [dbo].[Ddt_Tank_UserIdInfo_View]
AS
SELECT TOP 0 userid, username, nickname,Sex
FROM Db_Tank.dbo.Sys_Users_Detail

GO
