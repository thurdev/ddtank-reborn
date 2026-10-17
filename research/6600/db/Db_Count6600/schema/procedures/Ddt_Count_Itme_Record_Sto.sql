-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Itme_Record_Sto (modified 2012-04-21T07:53:24.873)
--作者:vivi	--日期:2009-10-22	--描述：查询用户武器记录（强化）
CREATE PROCEDURE Ddt_Count_Itme_Record_Sto
 @Nick_Name Varchar (50), 
 @Operation Int, 
 @Begin_Date Varchar(20), 
 @End_Date Varchar(20)
AS  
BEGIN 
if (@Nick_Name!='')
begin
 Select A.UserID as id,A.NickName,B.Timer,B.UserName,B.Operation,
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
 Where A.NickName=@Nick_Name and B.Operation=@Operation and B.Timer>=@Begin_Date and B.Timer<=@End_Date 
end
else
begin
 Select A.NickName,B.Timer,B.UserName,B.Operation,
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
 Where B.Operation=@Operation and B.Timer>=@Begin_Date and B.Timer<=@End_Date 
end
END



GO
