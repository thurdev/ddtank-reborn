-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Consortia_WeekList (modified 2021-06-04T05:18:35.800)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新公会周排行>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Update_Consortia_WeekList]
as 
update Consortia set LastWeekRiches=Riches + isnull((select sum(Riches) from Consortia_Level with (nolock) where Level<=a.Level),0)  +isnull((select sum(StoreRiches) from Consortia_Level with(nolock) where Level<=a.StoreLevel),0) +isnull((select sum(SmithRiches) from Consortia_Level with(nolock) where Level<=a.SmithLevel),0) +isnull((select sum(ShopRiches) from Consortia_Level  with (nolock) where Level<=a.ShopLevel),0) ,
 LastWeekHonor = Honor
from Consortia a








GO
