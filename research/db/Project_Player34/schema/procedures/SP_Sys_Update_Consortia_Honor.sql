-- SQL_STORED_PROCEDURE dbo.SP_Sys_Update_Consortia_Honor (modified 2021-06-04T05:18:35.790)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<更新信息：更新公会功勋排行榜>
-- =============================================
CREATE  Procedure [dbo].[SP_Sys_Update_Consortia_Honor]
as 
update  Consortia set Honor = isnull(A.offer,0) from Consortia
left join (select consortiaID,sum(offer) as offer from dbo.Sys_Users_Detail with(nolock) where ConsortiaID<>0 group by ConsortiaID) as A on 
Consortia.ConsortiaID = A.consortiaID where Consortia.IsExist=1









GO
