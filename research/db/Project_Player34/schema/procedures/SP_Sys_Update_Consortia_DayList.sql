-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Consortia_DayList (modified 2021-06-04T05:18:35.783)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新公会日排行功能>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Update_Consortia_DayList]
as 
update Consortia set AddDayRiches=Riches +isnull((select sum(Riches) from Consortia_Level  with (nolock) where Level<=a.Level),0)  +isnull((select sum(StoreRiches) from Consortia_Level  with (nolock) where Level<=a.StoreLevel),0) +isnull((select sum(SmithRiches) from Consortia_Level with (nolock) where Level<=a.SmithLevel),0) +isnull((select sum(ShopRiches) from Consortia_Level  with (nolock) where Level<=a.ShopLevel),0) -LastDayRiches,
 LastDayRiches=Riches + isnull((select sum(Riches) from Consortia_Level with (nolock) where Level<=a.Level),0)  +isnull((select sum(StoreRiches) from Consortia_Level with (nolock) where Level<=a.StoreLevel),0) +isnull((select sum(SmithRiches) from Consortia_Level with (nolock) where Level<=a.SmithLevel),0) +isnull((select sum(ShopRiches) from Consortia_Level with (nolock) where Level<=a.ShopLevel),0) ,
 AddWeekRiches=Riches +isnull((select sum(Riches) from Consortia_Level with (nolock) where Level<=a.Level),0)  +isnull((select sum(StoreRiches) from Consortia_Level with (nolock) where Level<=a.StoreLevel),0) +isnull((select sum(SmithRiches) from Consortia_Level with (nolock) where Level<=a.SmithLevel),0) +isnull((select sum(ShopRiches) from Consortia_Level  with (nolock) where Level<=a.ShopLevel),0) -LastWeekRiches,
 AddDayHonor = Honor-LastDayHonor, AddWeekHonor = Honor-LastWeekHonor,
 LastDayHonor = Honor
from Consortia  a with (nolock) where IsExist=1








GO
