-- VIEW dbo.V_Warrior_Fam_Rank (modified 2015-02-20T11:43:14.613)
CREATE VIEW dbo.V_Warrior_Fam_Rank
AS
SELECT     dbo.Sys_Users_Detail.UserID, dbo.Sys_Users_Detail.NickName, dbo.Sys_Users_Labyrinth.myProgress
FROM         dbo.Sys_Users_Detail RIGHT OUTER JOIN
                      dbo.Sys_Users_Labyrinth ON dbo.Sys_Users_Detail.UserID = dbo.Sys_Users_Labyrinth.UserID

GO
