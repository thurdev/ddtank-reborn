-- SQL_STORED_PROCEDURE dbo.UserName_IsExist_Sto (modified 2012-04-21T07:53:24.153)
CREATE   proc UserName_IsExist_Sto
@name nvarchar(100)
as
begin 
select count(*) as counts from Db_Tank.dbo.Sys_Users_Detail where UserName=@name
end

GO
