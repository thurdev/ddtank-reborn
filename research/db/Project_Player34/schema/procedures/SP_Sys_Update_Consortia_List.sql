-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Consortia_List (modified 2021-06-04T05:18:35.793)









-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新公会排行>
-- =============================================
CREATE    Procedure [dbo].[SP_Sys_Update_Consortia_List]
as 

select LastDayRiches,ConsortiaID * 1 as ConsortiaID,SId = identity(int,1,1) into #TempC
from dbo.Consortia 
where IsExist<>0
order by LastDayRiches desc

update Consortia with(rowlock)
set Repute = #TempC.SId 
from #TempC 
where Consortia.ConsortiaID=#TempC.ConsortiaID

drop table #TempC











GO
