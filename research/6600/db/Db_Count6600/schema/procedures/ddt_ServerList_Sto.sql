-- SQL_STORED_PROCEDURE dbo.ddt_ServerList_Sto (modified 2012-04-21T07:53:25.153)

CREATE  PROCEDURE  [dbo].[ddt_ServerList_Sto] 
AS
--创建人:向洪	--创建时间:2009-07-04	--说明:返回频道列表
select a.id,a.name,a.ip,a.port,a.state,a.online,a.total,a.room,a.mustlevel,a.lowestlevel,b.openmap 
from Db_Tank.dbo.server_list a with(nolock) left join Db_Tank.dbo.Map_Server b with(nolock)
on (b.serverid=a.id)
GO
