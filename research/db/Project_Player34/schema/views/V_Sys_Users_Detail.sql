-- VIEW dbo.V_Sys_Users_Detail (modified 2022-08-17T20:54:56.463)
CREATE VIEW dbo.V_Sys_Users_Detail
AS
SELECT        dbo.Sys_Users_Detail.UserID, dbo.Sys_Users_Detail.NickName, dbo.Sys_Users_Detail.Sex, dbo.Sys_Users_Fight.Attack, dbo.Sys_Users_Fight.Defence, dbo.Sys_Users_Fight.Luck, dbo.Sys_Users_Fight.Agility, 
                         dbo.Sys_Users_Detail.Gold, dbo.Sys_Users_Detail.Money, dbo.Sys_Users_Detail.Style, dbo.Sys_Users_Detail.Colors, dbo.Sys_Users_Detail.Grade, dbo.Sys_Users_Detail.GP, dbo.Sys_Users_Detail.ConsortiaID, 
                         dbo.Sys_Users_Detail.State, dbo.Sys_Users_Detail.Hide, dbo.Sys_Users_Detail.Repute, dbo.Sys_Users_Detail.UserName, ISNULL(dbo.Consortia.ConsortiaName, '') AS ConsortiaName, dbo.Sys_Users_Detail.IsExist, 
                         dbo.Sys_Users_Detail.IsFirst, dbo.Sys_Users_Detail.Password, dbo.Sys_Users_Detail.Offer, dbo.Sys_Users_Detail.Win, dbo.Sys_Users_Detail.Total, dbo.Sys_Users_Detail.[Escape], dbo.Sys_Users_Detail.Skin, 
                         dbo.Sys_Users_Detail.IsConsortia, ISNULL(dbo.Consortia_Users.IsBanChat, 0) AS IsBanChat, dbo.Sys_Users_Detail.ReputeOffer, ISNULL(dbo.Consortia.Repute, 0) AS ConsortiaRepute, ISNULL(dbo.Consortia.[Level], 0) 
                         AS ConsortiaLevel, ISNULL(dbo.Consortia.Honor, 0) AS ConsortiaHonor, dbo.Sys_Users_Detail.AntiAddiction, dbo.Sys_Users_Detail.RichesOffer, dbo.Sys_Users_Detail.RichesRob, ISNULL(dbo.Consortia_Duty.DutyName, '') 
                         AS DutyName, ISNULL(dbo.Consortia_Duty.[Level], 0) AS DutyLevel, ISNULL(dbo.Consortia_Duty.[Right], 0) AS [Right], ISNULL(dbo.Consortia.ChairmanName, '') AS ChairmanName, dbo.Sys_Users_Detail.AddDayGP, 
                         dbo.Sys_Users_Detail.AddWeekGP, dbo.Sys_Users_Detail.AddDayOffer, dbo.Sys_Users_Detail.AddWeekOffer, ISNULL(dbo.Consortia.LastDayRiches, 0) AS ConsortiaRiches, dbo.Sys_Users_Detail.LastDayOffer, 
                         dbo.Sys_Users_Detail.LastDayGP, dbo.Sys_Users_Detail.CheckCount, ISNULL(dbo.Consortia.StoreLevel, 0) AS StoreLevel, ISNULL(dbo.Consortia.ShopLevel, 0) AS ShopLevel, ISNULL(dbo.Consortia.SmithLevel, 0) 
                         AS SmithLevel, dbo.Sys_Users_Detail.ForbidDate, dbo.Sys_Users_Detail.IsMarried, ISNULL(dbo.Sys_Users_Detail.SpouseID, 0) AS SpouseID, ISNULL(dbo.Sys_Users_Detail.SpouseName, '') AS SpouseName, 
                         dbo.Sys_Users_Detail.MarryInfoID, dbo.Sys_Users_Detail.IsCreatedMarryRoom, dbo.Sys_Users_Detail.DayLoginCount, dbo.Sys_Users_Detail.PasswordTwo, dbo.Sys_Users_Detail.SelfMarryRoomID, 
                         dbo.Sys_Users_Detail.IsGotRing, ISNULL(dbo.Consortia.Rename, 0) AS ConsortiaRename, ISNULL(dbo.Sys_Users_Detail.Rename, 0) AS Rename, dbo.Sys_Users_Detail.Nimbus, dbo.Sys_Users_Detail.LastAward, 
                         dbo.Sys_Users_Detail.GiftToken, dbo.Sys_Users_Detail.QuestSite, dbo.Sys_Users_Detail.PvePermission, dbo.Sys_Users_Detail.FightPower, dbo.Sys_Users_Password.PasswordQuestion1, 
                         dbo.Sys_Users_Password.PasswordQuestion2, ISNULL(dbo.Sys_Users_Password.LastFindDate, '2000-01-01') AS LastFindDate, ISNULL(dbo.Sys_Users_Password.FailedPasswordAttemptCount, 0) 
                         AS FailedPasswordAttemptCount, dbo.Sys_Users_Detail.AnswerSite, dbo.Sys_Users_Detail.LastAuncherAward, dbo.Sys_Users_Detail.Medal, dbo.Sys_Users_Detail.LastWeeklyVersion, dbo.Sys_Users_Detail.LastWeekly, 
                         dbo.Sys_Users_Detail.AchievementPoint, dbo.Sys_Users_Detail.IsInSpaPubMoneyToday, dbo.Sys_Users_Detail.IsInSpaPubGoldToday, dbo.Sys_Users_Detail.SpaPubMoneyRoomLimit, 
                         dbo.Sys_Users_Detail.FightLabPermission, dbo.Sys_Users_Detail.LastSpaDate, dbo.Sys_Users_Detail.SpaPubGoldRoomLimit, dbo.Sys_Users_Detail.ChatCount, dbo.Sys_VIP_Info.VIPLevel, dbo.Sys_VIP_Info.VIPExp, 
                         dbo.Sys_VIP_Info.VIPExpireDay, dbo.Sys_VIP_Info.LastVIPPackTime, dbo.Sys_Users_Detail.WeaklessGuildProgressStr, dbo.Sys_Users_Detail.IsOldPlayer, dbo.Sys_VIP_Info.CanTakeVipReward, dbo.Sys_VIP_Info.VIPLastdate, 
                         dbo.Sys_Users_Detail.LastDate, dbo.Sys_VIP_Info.typeVIP, ISNULL(dbo.Consortia.BadgeID, 0) AS BadgeID, dbo.Sys_Users_Detail.Score, dbo.Sys_Users_Detail.OptionOnOff, 
                         dbo.Sys_Users_Detail.isOldPlayerHasValidEquitAtLogin, dbo.Sys_Users_Detail.badLuckNumber, dbo.Sys_Users_Detail.luckyNum, dbo.Sys_Users_Detail.lastLuckyNumDate, dbo.Sys_Users_Detail.lastLuckNum, 
                         dbo.Sys_Users_Detail.IsShowConsortia, dbo.Sys_Users_Fight.HP, dbo.Sys_Users_Detail.Honor, dbo.Sys_VIP_Info.VIPNextLevelDaysNeeded, dbo.Sys_Users_Detail.BoxGetDate, dbo.Sys_Users_Detail.AlreadyGetBox, 
                         dbo.Sys_Users_Detail.BoxProgression, dbo.Sys_Users_Detail.GetBoxLevel, dbo.Sys_Users_Detail.AddWeekLeagueScore, dbo.Sys_Users_Detail.WeekLeagueRanking, dbo.Sys_Users_Detail.IsRecharged, 
                         dbo.Sys_Users_Detail.IsGetAward, dbo.Sys_Users_Detail.OnlineTime, dbo.Sys_Users_Detail.freezesDate, dbo.Sys_Users_Detail.honourOfMaster, dbo.Sys_Users_Detail.graduatesCount, 
                         dbo.Sys_Users_Detail.masterOrApprentices, dbo.Sys_Users_Detail.masterID, dbo.Sys_Users_Detail.apprenticeshipState, dbo.Sys_Users_Detail.NewDay, dbo.Sys_Users_Detail.LastDateSecond, 
                         dbo.Sys_Users_Detail.charmGP, dbo.Sys_Users_Detail.ShopFinallyGottenTime, dbo.Sys_Users_Detail.CanSentMoney, dbo.Sys_Users_Detail.EliteScore, dbo.Sys_Users_Detail.hardCurrency, 
                         dbo.Sys_Users_Detail.evolutionExp, dbo.Sys_Users_Detail.evolutionGrade, dbo.Sys_Users_Detail.MoneyPlus, dbo.Sys_Users_Detail.UseOffer, dbo.Sys_Users_Detail.MoneyLock, dbo.Sys_Users_Detail.LastGetEgg, 
                         dbo.Sys_Users_Detail.IsFistGetPet, dbo.Sys_Users_Detail.LastRefreshPet, dbo.Sys_Users_Detail.petScore, dbo.Sys_Users_Detail.accumulativeLoginDays, dbo.Sys_Users_Detail.accumulativeAwardDays, 
                         dbo.Sys_Users_Detail.honorId, dbo.Sys_Users_Detail.damageScores, dbo.Sys_Users_Detail.totemId, dbo.Sys_Users_Detail.myHonor, dbo.Sys_Users_Detail.MaxBuyHonor, dbo.Sys_Users_Detail.necklaceExp, 
                         dbo.Sys_Users_Detail.necklaceExpAdd, dbo.Sys_Users_Detail.GhostEquipList, dbo.Sys_Users_Detail.fineSuitExp
FROM            dbo.Sys_Users_Detail LEFT OUTER JOIN
                         dbo.Sys_Users_Fight ON dbo.Sys_Users_Detail.UserID = dbo.Sys_Users_Fight.UserID LEFT OUTER JOIN
                         dbo.Consortia ON dbo.Sys_Users_Detail.ConsortiaID = dbo.Consortia.ConsortiaID LEFT OUTER JOIN
                         dbo.Consortia_Users ON dbo.Sys_Users_Detail.UserID = dbo.Consortia_Users.UserID LEFT OUTER JOIN
                         dbo.Consortia_Duty ON dbo.Consortia_Users.DutyID = dbo.Consortia_Duty.DutyID LEFT OUTER JOIN
                         dbo.Sys_Users_Password ON dbo.Sys_Users_Password.UserID = dbo.Sys_Users_Detail.UserID LEFT OUTER JOIN
                         dbo.Sys_Users_Order ON dbo.Sys_Users_Detail.UserID = dbo.Sys_Users_Order.UserID LEFT OUTER JOIN
                         dbo.Sys_VIP_Info ON dbo.Sys_Users_Detail.UserID = dbo.Sys_VIP_Info.UserID

GO
