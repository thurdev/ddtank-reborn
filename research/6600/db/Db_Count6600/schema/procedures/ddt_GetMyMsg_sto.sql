-- SQL_STORED_PROCEDURE dbo.ddt_GetMyMsg_sto (modified 2012-04-21T07:53:24.997)
-- Author:keny-- Date:2009-12-02  -- Description:为九成代理商提供根据用户名查询自己的信息
CREATE proc ddt_GetMyMsg_sto
@userName varchar(20)
as
if(@userName is null)
return
else
select s.UserId,s.NickName,s.Grade,(select ConsortiaName from db_tank_copy.dbo.Consortia where ConsortiaID in (s.ConsortiaID)) as ConsortiaName 
from db_tank_copy.dbo.sys_users_detail as s where s.userId in (select userId from db_tank_copy.dbo.sys_users_detail where userName = @userName)
GO
