-- VIEW dbo.V_Sys_Users_Friends (modified 2020-12-11T12:41:32.960)
/*LEFT OUTER JOIN
dbo.Consortia_Duty ON dbo.Consortia_Users.DutyID = dbo.Consortia_Duty.DutyID*/
CREATE VIEW [dbo].[V_Sys_Users_Friends]
AS
SELECT        dbo.Sys_Users_Friends.ID, dbo.Sys_Users_Friends.UserID, dbo.Sys_Users_Friends.FriendID, dbo.Sys_Users_Friends.AddDate, dbo.Sys_Users_Friends.Remark, dbo.Sys_Users_Friends.IsExist, 
                         dbo.Sys_Users_Friends.Relation, dbo.Sys_Users_Detail.NickName, dbo.Sys_Users_Detail.Style, dbo.Sys_Users_Detail.Sex, dbo.Sys_Users_Detail.Colors, dbo.Sys_Users_Detail.Grade, 
                         dbo.Sys_Users_Detail.Hide, dbo.Sys_Users_Detail.State, dbo.Sys_Users_Detail.Offer, dbo.Sys_Users_Detail.Total, dbo.Sys_Users_Detail.[Escape], dbo.Sys_Users_Detail.Win, 
                         ISNULL(dbo.Consortia.ConsortiaName, '') AS ConsortiaName, dbo.Sys_Users_Detail.Repute, dbo.Sys_Users_Detail.UserName, ISNULL(dbo.Consortia_Duty.DutyName, '') AS DutyName, 
                         dbo.Sys_Users_Detail.Nimbus, dbo.Sys_Users_Detail.FightPower, dbo.Sys_Users_Detail.apprenticeshipState
FROM            dbo.Sys_Users_Friends LEFT OUTER JOIN
                         dbo.Sys_Users_Detail ON dbo.Sys_Users_Friends.FriendID = dbo.Sys_Users_Detail.UserID LEFT OUTER JOIN
                         dbo.Consortia ON dbo.Sys_Users_Detail.ConsortiaID = dbo.Consortia.ConsortiaID LEFT OUTER JOIN
                         dbo.Consortia_Users ON dbo.Sys_Users_Detail.UserID = dbo.Consortia_Users.UserID LEFT OUTER JOIN
                         dbo.Consortia_Duty ON dbo.Consortia_Users.DutyID = dbo.Consortia_Duty.DutyID

GO
