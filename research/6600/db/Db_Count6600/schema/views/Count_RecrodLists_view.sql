-- VIEW dbo.Count_RecrodLists_view (modified 2012-04-21T07:53:24.327)
CREATE  view [dbo].[Count_RecrodLists_view]
as
select A.Id,B.username,B.nickname,A.AddItem,A.Operation,
case A.Operation 
	when '1' then '强化' 
	when '2' then '合成' 
	when '3' then '熔炼' 
	when '4' then '转移' 
	end OperationName
,A.ItemName,A.EnterTime as Timer,A.ItemID,A.BeginProperty,A.EndProperty,A.Result,
case A.Result
       when '1' then '成功'
       else '失败'
       end Results
 from db_Count.dbo.Log_Item as A
left Outer  join db_Count.dbo.Ddtc_Users_Detail as B on A.userId=B.userId


GO
