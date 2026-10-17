-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Consortia_FightPower (modified 2015-01-25T14:04:48.203)
-- =============================================
-- Author:		<jacken>
-- ALTER  date: <2010-02-02>
-- Description:	<更新信息：更新公会战斗力排行榜>
-- =============================================
CREATE  Procedure [dbo].[SP_Sys_Update_Consortia_FightPower]
as 
update  Consortia set FightPower = isnull(A.FightPower,0) from Consortia
left join (select consortiaID,sum(FightPower) as FightPower from dbo.Sys_Users_Detail with(nolock) where ConsortiaID<>0 group by ConsortiaID) as A on 
Consortia.ConsortiaID = A.consortiaID where Consortia.IsExist=1

GO
