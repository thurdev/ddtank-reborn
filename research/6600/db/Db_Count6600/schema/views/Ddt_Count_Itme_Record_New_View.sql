-- VIEW dbo.Ddt_Count_Itme_Record_New_View (modified 2012-04-21T07:53:24.717)
CREATE   view [dbo].[Ddt_Count_Itme_Record_New_View]
as
select B.ID,A.UserID,A.NickName,A.UserName,B.EnterTime,B.Operation,
	case B.Operation 
	when '1' then '强化' 
	when '2' then '合成' 
	when '3' then '熔炼' 
	when '4' then '转移' 
	end OperationName,B.ItemName,B.ItemID,B.AddItem,B.BeginProperty,B.EndProperty,
        case B.Result 
	when '1' then '成功'
	else '失败'
	end Result
 From db_count.dbo.Log_Item as   B 
        Left Outer join db_tank_copy.dbo.Sys_Users_Detail A
 	On A.UserID=B.UserID 




GO
