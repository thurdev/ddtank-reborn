-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_Experience_Rate_Show_Sto (modified 2012-04-21T07:53:24.763)
CREATE  PROCEDURE Ddt_Tank_Experience_Rate_Show_Sto 
 @ServerID int,
 @type int
 AS 
/*查询表Experience_Rate数据*/
 Select A.ServerID,B.Name,A.Rate,A.BeginDay,A.EndDay,A.BeginTime,A.EndTime,A.Type
from Db_Tank.dbo.Rate A with(nolock) left outer join Db_Tank.dbo.Server_List B with(nolock) On(A.ServerID=B.Id) where ServerID=@ServerID and type=@type
GO
