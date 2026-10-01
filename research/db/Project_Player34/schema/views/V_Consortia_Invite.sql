-- VIEW dbo.V_Consortia_Invite (modified 2020-12-11T12:41:32.940)
CREATE VIEW [dbo].[V_Consortia_Invite]
AS
SELECT        dbo.Consortia_Invite_Users.ID, dbo.Consortia_Invite_Users.ConsortiaID, dbo.Consortia_Invite_Users.ConsortiaName, dbo.Consortia_Invite_Users.UserID, dbo.Consortia_Invite_Users.UserName, 
                         dbo.Consortia_Invite_Users.InviteID, dbo.Consortia_Invite_Users.InviteName, dbo.Consortia_Invite_Users.InviteDate, dbo.Consortia_Invite_Users.Remark, dbo.Consortia_Invite_Users.IsExist, 
                         dbo.Consortia.ChairmanName, dbo.Consortia.MaxCount, dbo.Consortia.CelebCount, dbo.Consortia.Honor, dbo.Consortia.Repute, dbo.Consortia.Count, dbo.Sys_VIP_Info.VIPLevel
FROM            dbo.Consortia_Invite_Users LEFT OUTER JOIN
                         dbo.Sys_VIP_Info ON dbo.Consortia_Invite_Users.UserID = dbo.Sys_VIP_Info.UserID LEFT OUTER JOIN
                         dbo.Consortia ON dbo.Consortia_Invite_Users.ConsortiaID = dbo.Consortia.ConsortiaID

GO
