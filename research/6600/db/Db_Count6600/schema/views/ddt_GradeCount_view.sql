-- VIEW dbo.ddt_GradeCount_view (modified 2012-04-21T07:53:24.780)

CREATE VIEW [dbo].[ddt_GradeCount_view]
AS
SELECT UserID AS id, UserName, NickName, Grade,gp as Gp,FightPower
FROM Db_Tank.dbo.Sys_Users_Detail


GO
