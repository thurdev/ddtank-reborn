-- SQL_STORED_PROCEDURE dbo.ddt_GetUseIsExist_Sto (modified 2012-04-21T07:53:25.043)
-- Author:keny-- Date:2009-12-03  -- Description:为九成代理商提供根据用户名查询该用户是否存在
CREATE proc ddt_GetUseIsExist_Sto
@userName varchar(20),
@isExist int output
as
if(@userName is null)
return
else
select @isExist = count(userId) from db_tank_copy.dbo.sys_users_detail where userName = @userName
return @isExist
GO
