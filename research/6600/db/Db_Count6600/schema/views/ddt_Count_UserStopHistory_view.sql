-- VIEW dbo.ddt_Count_UserStopHistory_view (modified 2012-04-21T07:53:24.747)
CREATE   view [dbo].[ddt_Count_UserStopHistory_view]
as
select A.*,B.UserName as Names from Db_Count.dbo.Count_UserStopHistory as A left OUTER  join Db_Count.dbo.Count_UserStopHistory_B as B 
on A.NickName=B.NickName where A.OperateTime=B.date



GO
