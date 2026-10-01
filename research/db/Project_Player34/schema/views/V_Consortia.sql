-- VIEW dbo.V_Consortia (modified 2020-12-11T12:41:32.923)
CREATE VIEW [dbo].[V_Consortia]
AS
SELECT        dbo.Consortia.ConsortiaID, dbo.Consortia.ConsortiaName, dbo.Consortia.Honor, dbo.Consortia.CreatorID, dbo.Consortia.CreatorName, dbo.Consortia.ChairmanID, dbo.Consortia.ChairmanName, 
                         dbo.Consortia.Description, dbo.Consortia.Placard, dbo.Consortia.[Level], dbo.Consortia.MaxCount, dbo.Consortia.CelebCount, dbo.Consortia.BuildDate, dbo.Consortia.Repute, dbo.Consortia.Count, 
                         dbo.Consortia.IP, dbo.Consortia.Port, dbo.Consortia.IsExist, dbo.Consortia.Riches, dbo.Consortia.DeductDate, dbo.Consortia.WarnDate, dbo.Consortia.LastDayRiches, dbo.Consortia.AddDayRiches, 
                         dbo.Consortia.LastWeekRiches, dbo.Consortia.AddWeekRiches, dbo.Consortia.LastDayHonor, dbo.Consortia.AddDayHonor, dbo.Consortia.LastWeekHonor, dbo.Consortia.AddWeekHonor, 
                         dbo.Consortia.OpenApply, dbo.Consortia.StoreLevel, dbo.Consortia.SmithLevel, dbo.Consortia.ShopLevel, dbo.Consortia.Rename, dbo.Consortia.KickDate, dbo.Consortia.KickCount, dbo.Consortia.FightPower, 
                         CASE WHEN Consortia.Repute = 0 THEN 9999999 ELSE Consortia.Repute END AS ReputeSort, dbo.Sys_VIP_Info.typeVIP, dbo.Sys_VIP_Info.VIPLevel, dbo.Consortia.SkillLevel, dbo.Consortia.BadgeType, 
                         dbo.Consortia.BadgeName, dbo.Consortia.BadgeID, dbo.Consortia.BadgeBuyTime, dbo.Consortia.ValidDate, dbo.Consortia.DateOpenTask, dbo.Consortia.consortiaPower
FROM            dbo.Consortia LEFT OUTER JOIN
                         dbo.Sys_VIP_Info ON dbo.Consortia.ChairmanID = dbo.Sys_VIP_Info.UserID

GO
