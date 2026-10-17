-- SQL_STORED_PROCEDURE dbo.ddt_GetUserFriends_sto (modified 2012-04-21T07:53:24.997)
-- Author:keny-- Date:2009-12-02  -- Description:为九成代理商提供根据用户名查询好友信息
CREATE proc ddt_GetUserFriends_sto
@userName varchar(20)
as
if(@userName is null)
return
else
select s.UserId,s.UserName,s.NickName,s.Grade,(select ConsortiaName from db_tank_copy.dbo.Consortia where ConsortiaID in (s.ConsortiaID)) as ConsortiaName 
from db_tank_copy.dbo.sys_users_detail as s where s.userId in (select FriendID from db_tank_copy.dbo.Sys_Users_Friends where userId in (select userId from db_tank_copy.dbo.sys_users_detail where userName = @userName))
GO
