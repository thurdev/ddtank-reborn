-- VIEW dbo.ddt_Tank_Copy_Consortia_View (modified 2012-04-21T07:53:24.793)
--Author：keny         Date：2009-12-02       Description：查询DB_TANK_COPY表里的公会数据
CREATE VIEW [dbo].[ddt_Tank_Copy_Consortia_View] 
AS
 SELECT ConsortiaID AS id, ConsortiaName, Honor, CreatorID, CreatorName, ChairmanID, ChairmanName, Description, 
Placard, [Level], MaxCount, CelebCount, BuildDate, Repute, COUNT, IP, Port, IsExist, Riches, DeductDate, WarnDate, 
LastDayRiches, AddDayRiches, LastWeekRiches, AddWeekRiches, LastDayHonor, AddDayHonor, LastWeekHonor, 
AddWeekHonor,StoreLevel,SmithLevel,ShopLevel 
FROM Db_tank_copy.dbo.Consortia
 WHERE isExist=1

GO
