-- VIEW dbo.V_Consortia_Users (modified 2020-12-11T12:41:32.943)
CREATE VIEW [dbo].[V_Consortia_Users]
AS
SELECT        dbo.Consortia_Users.ID, dbo.Consortia_Users.ConsortiaID, dbo.Consortia_Users.UserID, dbo.Consortia_Users.UserName, dbo.Consortia_Users.RatifierID, dbo.Consortia_Users.RatifierName, 
                         dbo.Consortia_Users.DutyID, dbo.Consortia_Users.Remark, dbo.Consortia_Users.IsBanChat, dbo.Consortia_Users.IsExist, dbo.Sys_Users_Detail.Grade, dbo.Sys_Users_Detail.GP, 
                         dbo.Sys_Users_Detail.Repute, dbo.Sys_Users_Detail.State, dbo.Sys_Users_Detail.Offer, dbo.Consortia_Duty.[Level], dbo.Consortia_Duty.DutyName, dbo.Consortia_Duty.[Right], dbo.Sys_Users_Detail.Colors, 
                         dbo.Sys_Users_Detail.Style, dbo.Sys_Users_Detail.Hide, dbo.Sys_Users_Detail.Skin, dbo.Sys_Users_Detail.LastDate, dbo.Sys_Users_Detail.Sex, dbo.Sys_Users_Detail.Win, dbo.Sys_Users_Detail.Total, 
                         dbo.Sys_Users_Detail.[Escape], dbo.Sys_Users_Detail.RichesOffer, dbo.Sys_Users_Detail.RichesRob, dbo.Sys_Users_Detail.UserName AS LoginName, dbo.Sys_Users_Detail.Nimbus, 
                         dbo.Sys_Users_Detail.FightPower, dbo.Sys_Users_Detail.UseOffer, dbo.Sys_Users_Detail.AchievementPoint, dbo.Sys_Users_Detail.Honor, dbo.Sys_VIP_Info.typeVIP, dbo.Sys_VIP_Info.VIPLevel, 
                         dbo.Sys_VIP_Info.VIPExpireDay
FROM            dbo.Consortia_Users INNER JOIN
                         dbo.Sys_VIP_Info ON dbo.Consortia_Users.UserID = dbo.Sys_VIP_Info.UserID LEFT OUTER JOIN
                         dbo.Sys_Users_Detail ON dbo.Consortia_Users.UserID = dbo.Sys_Users_Detail.UserID LEFT OUTER JOIN
                         dbo.Consortia_Duty ON dbo.Consortia_Users.DutyID = dbo.Consortia_Duty.DutyID

GO
