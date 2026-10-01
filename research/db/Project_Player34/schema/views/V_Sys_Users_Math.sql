-- VIEW dbo.V_Sys_Users_Math (modified 2020-12-11T12:41:32.960)
CREATE VIEW [dbo].[V_Sys_Users_Math]
AS
SELECT        dbo.Sys_User_Match_Info.UserID, dbo.Sys_User_Match_Info.dailyScore, dbo.Sys_User_Match_Info.dailyWinCount, dbo.Sys_User_Match_Info.dailyGameCount, dbo.Sys_User_Match_Info.weeklyRanking, 
                         dbo.Sys_User_Match_Info.weeklyScore, dbo.Sys_User_Match_Info.weeklyGameCount, dbo.Sys_Users_Detail.UserName, dbo.Sys_Users_Detail.NickName, dbo.Sys_VIP_Info.typeVIP, 
                         dbo.Sys_VIP_Info.VIPLevel, dbo.Sys_Users_Detail.Grade, dbo.Sys_Users_Detail.Colors, dbo.Sys_Users_Detail.Style, dbo.Sys_Users_Detail.Skin, dbo.Sys_Users_Detail.Sex, dbo.Sys_Users_Detail.Hide, 
                         dbo.Sys_Users_Detail.Offer, dbo.Sys_Users_Detail.ReputeOffer, dbo.Sys_Users_Detail.Win, dbo.Sys_Users_Detail.Total, dbo.Sys_Users_Detail.Repute, dbo.Sys_Users_Detail.Nimbus, 
                         dbo.Sys_Users_Detail.GP, dbo.Sys_Users_Detail.FightPower, dbo.Sys_Users_Detail.AchievementPoint, dbo.Sys_Users_Detail.apprenticeshipState, dbo.Sys_Users_Detail.State
FROM            dbo.Sys_Users_Detail INNER JOIN
                         dbo.Sys_User_Match_Info ON dbo.Sys_Users_Detail.UserID = dbo.Sys_User_Match_Info.UserID INNER JOIN
                         dbo.Sys_VIP_Info ON dbo.Sys_User_Match_Info.UserID = dbo.Sys_VIP_Info.UserID

GO
