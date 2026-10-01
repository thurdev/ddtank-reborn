-- VIEW dbo.V_Sys_Marry_Info (modified 2020-12-11T12:41:32.947)
CREATE VIEW [dbo].[V_Sys_Marry_Info]
AS
SELECT        dbo.Marry_Info.ID, dbo.Marry_Info.UserID, dbo.Marry_Info.IsPublishEquip, dbo.Marry_Info.Introduction, dbo.Marry_Info.IsExist, ISNULL(dbo.Sys_Users_Detail.NickName, '') AS NickName, 
                         dbo.Sys_Users_Detail.IsConsortia, dbo.Sys_Users_Detail.ConsortiaID, dbo.Sys_Users_Detail.Sex, dbo.Sys_Users_Detail.Win, dbo.Sys_Users_Detail.Total, dbo.Sys_Users_Detail.[Escape], 
                         dbo.Sys_Users_Detail.GP, ISNULL(dbo.Sys_Users_Detail.Honor, '') AS Honor, dbo.Sys_Users_Detail.Style, dbo.Sys_Users_Detail.Colors, dbo.Sys_Users_Detail.Hide, dbo.Sys_Users_Detail.Grade, 
                         dbo.Sys_Users_Detail.State, ISNULL(c.Repute, 0) AS Repute, dbo.Sys_Users_Detail.Skin, dbo.Sys_Users_Detail.Offer, dbo.Sys_Users_Detail.IsMarried, '' AS ConsortiaName, 
                         dbo.Sys_Users_Detail.IsExist AS UserExist, '' AS DutyName, dbo.Sys_Users_Detail.Nimbus, dbo.Sys_Users_Detail.FightPower, dbo.Sys_VIP_Info.VIPLevel, dbo.Sys_VIP_Info.typeVIP
FROM            dbo.Marry_Info LEFT OUTER JOIN
                         dbo.Sys_VIP_Info ON dbo.Marry_Info.UserID = dbo.Sys_VIP_Info.UserID LEFT OUTER JOIN
                         dbo.Sys_Users_Detail WITH (NOLOCK) ON dbo.Marry_Info.UserID = dbo.Sys_Users_Detail.UserID LEFT OUTER JOIN
                         dbo.Sys_Users_Order AS c ON dbo.Sys_Users_Detail.UserID = c.UserID
WHERE        (dbo.Marry_Info.IsExist = 1)

GO
