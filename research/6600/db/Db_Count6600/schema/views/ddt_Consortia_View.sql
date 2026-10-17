-- VIEW dbo.ddt_Consortia_View (modified 2012-04-21T07:53:24.717)

-- Author:vivi -- Date:2009-10-26  -- Description:公会查询
CREATE VIEW [dbo].[ddt_Consortia_View]
AS
SELECT     ConsortiaID AS id, ConsortiaName, Honor, CreatorID, CreatorName, ChairmanID, ChairmanName, Description, Placard, [Level], MaxCount, CelebCount, 
                      BuildDate, Repute, Count, IP, Port, IsExist, Riches, DeductDate, WarnDate, LastDayRiches, AddDayRiches, LastWeekRiches, AddWeekRiches, 
                      LastDayHonor, AddDayHonor, LastWeekHonor, AddWeekHonor,StoreLevel,SmithLevel,ShopLevel
FROM Db_tank.dbo.Consortia where isExist=1







GO
