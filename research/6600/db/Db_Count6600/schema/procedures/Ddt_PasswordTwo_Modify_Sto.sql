-- SQL_STORED_PROCEDURE dbo.Ddt_PasswordTwo_Modify_Sto (modified 2012-04-21T07:53:25.013)
CREATE  PROCEDURE Ddt_PasswordTwo_Modify_Sto
 @nickname varchar(50), 
 @passwordtwo varchar(50), 
 @ouototal varchar(50)='' output AS
--创建人:Andy	--创建时间:2009-08-22	--说明:战斗换装表 增加和修改操作
   begin 
     UPDATE Db_Tank.dbo.sys_users_detail Set passwordtwo=@passwordtwo where nickname=@nickname
     set @ouototal=@@ROWCOUNT   	
   end
GO
