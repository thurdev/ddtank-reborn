-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Users_DayList (modified 2021-06-04T05:18:35.807)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新用户日排行>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Update_Users_DayList]
as 
update Sys_Users_Detail set AddDayGP=a.GP-a.LastDayGP,LastDayGP=a.GP,AddWeekGP=a.GP-a.LastWeekGP,
AddDayOffer=a.Offer-a.LastDayOffer,LastDayOffer=a.offer,AddWeekOffer=a.offer-a.LastWeekOffer
from Sys_Users_Detail a with(nolock) where IsExist=1








GO
