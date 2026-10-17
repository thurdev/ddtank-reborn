-- SQL_STORED_PROCEDURE dbo.ddt_Update_Server_Map_Sto (modified 2012-04-21T07:53:25.187)
CREATE  PROCEDURE  [dbo].[ddt_Update_Server_Map_Sto]
@serverId int,
@strMap nvarchar(4000)
AS
--创建人:向洪	--创建时间:2009-07-04	--说明:修改频道地图的关系
update Db_Tank.dbo.Map_Server set openmap=@strMap where serverid=@serverId

GO
