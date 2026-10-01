-- VIEW dbo.V_Celeb_Users (modified 2020-12-11T12:41:32.917)

CREATE VIEW [dbo].[V_Celeb_Users]
AS
SELECT dbo.Sys_Users_Detail.UserID, dbo.Sys_Users_Detail.NickName, 
      dbo.Sys_Users_Detail.Sex, dbo.Sys_Users_Fight.Attack, 
      dbo.Sys_Users_Fight.Defence, dbo.Sys_Users_Fight.Luck, 
      dbo.Sys_Users_Fight.Agility, dbo.Sys_Users_Detail.Gold, 
      dbo.Sys_Users_Detail.Money, dbo.Sys_Users_Detail.Style, 
      dbo.Sys_Users_Detail.Colors, dbo.Sys_Users_Detail.Grade, 
      dbo.Sys_Users_Detail.GP, dbo.Sys_Users_Detail.ConsortiaID, 
      dbo.Sys_Users_Detail.State, dbo.Sys_Users_Detail.Hide, 
      dbo.Sys_Users_Detail.Repute, dbo.Sys_Users_Detail.UserName, 
      ISNULL(dbo.Consortia.ConsortiaName, '') AS ConsortiaName, 
      dbo.Sys_Users_Detail.IsExist, dbo.Sys_Users_Detail.IsFirst, 
      dbo.Sys_Users_Detail.Password, dbo.Sys_Users_Detail.Offer, 
      dbo.Sys_Users_Detail.Win, dbo.Sys_Users_Detail.Total, 
      dbo.Sys_Users_Detail.[Escape], dbo.Sys_Users_Detail.Skin, 
      dbo.Sys_Users_Detail.IsConsortia, ISNULL(dbo.Consortia_Users.IsBanChat, 0) 
      AS IsBanChat, dbo.Sys_Users_Detail.ReputeOffer, ISNULL(dbo.Consortia.Repute, 0) 
      AS ConsortiaRepute, ISNULL(dbo.Consortia.[Level], 0) AS ConsortiaLevel, 
      ISNULL(dbo.Consortia.Honor, 0) AS ConsortiaHonor, 
      dbo.Sys_Users_Detail.AntiAddiction, dbo.Sys_Users_Detail.RichesOffer, 
      dbo.Sys_Users_Detail.RichesRob, ISNULL(dbo.Consortia_Duty.DutyName, '') 
      AS DutyName, ISNULL(dbo.Consortia_Duty.[Level], 0) AS DutyLevel, 
      ISNULL(dbo.Consortia_Duty.[Right], 0) AS [Right], 
      ISNULL(dbo.Consortia.ChairmanName, '') AS ChairmanName, 
      dbo.Sys_Users_Detail.GP - dbo.Sys_Users_Detail.LastDayGP AS AddDayGP, 
      dbo.Sys_Users_Detail.GP - dbo.Sys_Users_Detail.LastWeekGP AS AddWeekGP, 
      dbo.Sys_Users_Detail.Offer - dbo.Sys_Users_Detail.LastDayOffer AS AddDayOffer, 
      dbo.Sys_Users_Detail.Offer - dbo.Sys_Users_Detail.LastWeekOffer AS AddWeekOffer
FROM dbo.Sys_Users_Detail LEFT OUTER JOIN
      dbo.Sys_Users_Fight ON 
      dbo.Sys_Users_Detail.UserID = dbo.Sys_Users_Fight.UserID LEFT OUTER JOIN
      dbo.Consortia ON 
      dbo.Sys_Users_Detail.ConsortiaID = dbo.Consortia.ConsortiaID LEFT OUTER JOIN
      dbo.Consortia_Users ON 
      dbo.Sys_Users_Detail.UserID = dbo.Consortia_Users.UserID LEFT OUTER JOIN
      dbo.Consortia_Duty ON dbo.Consortia_Users.DutyID = dbo.Consortia_Duty.DutyID




GO
