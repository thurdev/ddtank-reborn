-- VIEW dbo.Ddt_Count_Itme_Record_View (modified 2012-04-21T07:53:24.717)
-- UPDATE-Author:KENY -- Date:2009-12-24  -- Description:玩家强化操作记录(新增标识列)
CREATE  VIEW [dbo].[Ddt_Count_Itme_Record_View]
As
 Select B.Id as id,A.UserID,A.NickName,B.Timer,B.UserName,B.Operation,
	case B.Operation 
	when '1' then '强化' 
	when '2' then '合成' 
	when '3' then '熔炼' 
	when '4' then '转移' 
	end OperationName
	,B.ItemName,B.ItemID,B.BeginProperty,B.EndProperty,
	case B.Result 
	when '1' then '成功'
	else '失败'
	end Result
 From db_tank_copy.dbo.Item_Record  B 
        Left Outer join db_tank_copy.dbo.Sys_Users_Detail A
 	On A.UserID=B.UserID



GO
