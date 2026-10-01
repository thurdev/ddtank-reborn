-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Users_WeekList (modified 2021-06-04T05:18:35.823)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新用户周排名>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Update_Users_WeekList]
as 

update Sys_Users_Detail set LastWeekGP=a.GP, LastWeekOffer = a.Offer
from Sys_Users_Detail  a  with(nolock)








GO
