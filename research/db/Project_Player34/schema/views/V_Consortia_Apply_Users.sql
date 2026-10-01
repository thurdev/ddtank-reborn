-- VIEW dbo.V_Consortia_Apply_Users (modified 2020-12-11T12:41:32.937)
CREATE VIEW [dbo].[V_Consortia_Apply_Users]
AS
SELECT        dbo.Consortia_Apply_Users.ID, dbo.Consortia_Apply_Users.ConsortiaID, dbo.Consortia_Apply_Users.ConsortiaName, dbo.Consortia_Apply_Users.UserID, dbo.Consortia_Apply_Users.UserName, 
                         dbo.Consortia_Apply_Users.ApplyDate, dbo.Consortia_Apply_Users.Remark, dbo.Consortia_Apply_Users.IsExist, B.Grade, B.Win, B.Total, B.Repute, B.FightPower, dbo.Sys_VIP_Info.VIPLevel, 
                         dbo.Sys_VIP_Info.typeVIP, B.IsOldPlayer, dbo.Consortia.ChairmanID, dbo.Consortia.ChairmanName, B.Offer
FROM            dbo.Consortia_Apply_Users INNER JOIN
                         dbo.Sys_Users_Detail AS B ON B.UserID = dbo.Consortia_Apply_Users.UserID INNER JOIN
                         dbo.Consortia ON dbo.Consortia_Apply_Users.ConsortiaID = dbo.Consortia.ConsortiaID LEFT OUTER JOIN
                         dbo.Sys_VIP_Info ON dbo.Consortia_Apply_Users.UserID = dbo.Sys_VIP_Info.UserID

GO
