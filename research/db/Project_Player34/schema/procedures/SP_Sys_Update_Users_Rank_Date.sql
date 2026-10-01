-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Users_Rank_Date (modified 2021-06-04T05:18:35.820)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新用户排名>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Update_Users_Rank_Date]
as 
--FightPower
  Select FightPower,ConsortiaID,UserId * 1 as UserId,SId = identity(int,1,1) into #TempB
         From dbo.Sys_Users_Detail with(nolock)
              Order by FightPower desc

  INSERT INTO [dbo].[Sys_Users_Rank_Date](UserID)
  SELECT  UserId FROM  #TempB
         WHERE  Not EXISTS (SELECT Userid FROM [dbo].[Sys_Users_Rank_Date] A WHERE #TempB.UserId=A.Userid)      
           
  Update [dbo].[Sys_Users_Rank_Date] with(rowlock)
       Set [FightPower] = #TempB.SId, [PrevFightPower]= #TempB.SId, [ConsortiaID] =#TempB.ConsortiaID
       From #TempB 
           Where [dbo].[Sys_Users_Rank_Date].UserId=#TempB.UserId  
  Drop Table #TempB
--GP
Select GP,UserId * 1 as UserId,SId = identity(int,1,1) into #Tempc
         From dbo.Sys_Users_Detail with(nolock)
              Order by GP desc

  INSERT INTO [dbo].[Sys_Users_Rank_Date](UserID)
  SELECT  UserId FROM  #Tempc
         WHERE  Not EXISTS (SELECT Userid FROM [dbo].[Sys_Users_Rank_Date] A WHERE #Tempc.UserId=A.Userid)      
           
  Update [dbo].[Sys_Users_Rank_Date] with(rowlock)
       Set [GP] = #Tempc.SId, [PrevGP]= #Tempc.SId
       From #Tempc 
           Where [dbo].[Sys_Users_Rank_Date].UserId=#Tempc.UserId  
  Drop Table #Tempc
  --
select Riches,ChairmanID,ConsortiaID * 1 as ConsortiaID,SId = identity(int,1,1) into #TempC1
from dbo.Consortia 
where IsExist<>0
order by Riches desc
Update [dbo].[Sys_Users_Rank_Date] with(rowlock)
       Set [ConsortiaRiches] = #TempC1.SId, [ConsortiaPrevRiches]= #TempC1.SId
       From #TempC1
           Where [dbo].[Sys_Users_Rank_Date].UserId=#TempC1.ChairmanID  
drop table #TempC1

select FightPower,ChairmanID,ConsortiaID * 1 as ConsortiaID,SId = identity(int,1,1) into #TempC2
from dbo.Consortia 
where IsExist<>0
order by FightPower desc

Update [dbo].[Sys_Users_Rank_Date] with(rowlock)
       Set [ConsortiaFightPower] = #TempC2.SId, [ConsortiaPrevFightPower]= #TempC2.SId
       From #TempC2
           Where [dbo].[Sys_Users_Rank_Date].UserId=#TempC2.ChairmanID
drop table #TempC2

select [Level],ChairmanID,ConsortiaID * 1 as ConsortiaID,SId = identity(int,1,1) into #TempC3
from dbo.Consortia 
where IsExist<>0
order by [Level] desc

Update [dbo].[Sys_Users_Rank_Date] with(rowlock)
       Set [ConsortiaLevel] = #TempC3.SId, [ConsortiaPrevLevel]= #TempC3.SId
       From #TempC3
           Where [dbo].[Sys_Users_Rank_Date].UserId=#TempC3.ChairmanID
drop table #TempC3

  --End



GO
