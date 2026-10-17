-- SQL_STORED_PROCEDURE dbo.Ddt_Consortia_User_Sto (modified 2012-04-21T07:53:24.717)


CREATE PROCEDURE [dbo].[Ddt_Consortia_User_Sto]
@consortiaid int
as
begin
SELECT A.UserID AS id,A.DutyID,B.DutyName,B.Level,A.IsBanChat,A.IsExist INTO #temp01 
from Db_Tank.dbo.Consortia_Users AS A with(nolock),Db_Tank.dbo.Consortia_Duty AS B with(nolock)
WHERE A.DutyID=B.DutyID AND A.ConsortiaID=@consortiaid AND A.IsExist=1 order by B.level
select top 0 * from ddt_Consortia_User_View
union all
SELECT A.id,A.DutyID,A.DutyName,A.Level,A.IsBanChat,A.IsExist,B.UserName,B.NickName,B.Grade FROM #temp01 AS A LEFT OUTER JOIN Db_Tank.dbo.Sys_Users_Detail AS B ON(A.id=B.UserID)
drop table #temp01
end
GO
