-- SQL_STORED_PROCEDURE dbo.ddt_Update_ServerList_Sto (modified 2012-04-21T07:53:25.153)
CREATE  PROCEDURE  [dbo].[ddt_Update_ServerList_Sto]
@serverId int,
@serverName nvarchar(50)
AS
--创建人:向洪	--创建时间:2009-07-04	--说明:修改频道名称
update Db_Tank.dbo.Server_List set name=@serverName where id=@serverId

GO
