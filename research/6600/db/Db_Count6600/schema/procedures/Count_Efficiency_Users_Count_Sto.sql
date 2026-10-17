-- SQL_STORED_PROCEDURE dbo.Count_Efficiency_Users_Count_Sto (modified 2012-04-21T07:53:24.903)
create proc Count_Efficiency_Users_Count_Sto

as

declare @userIdList int

select @userIdList = userid from db_tank_copy.dbo.sys_users_detail where [date] between '2009-07-16' and '2009-07-17'

GO
