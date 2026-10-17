-- SQL_STORED_PROCEDURE dbo.ddt_MapList_Sto (modified 2012-04-21T07:53:25.153)
CREATE  PROCEDURE  [dbo].[ddt_MapList_Sto]
@strMapId varchar(4000)
AS
--创建人:向洪	--创建时间:2009-07-04	--说明:根据地图字符串返回地图列表
select id,name,
(len(@strMapId+',')-len(replace(@strMapId+',',Cast(id  as VarChar(10)),'')))/len(Cast(id  as VarChar(10))) as counts
	from Db_Tank.dbo.Game_Map with(nolock)
	--	where  CharIndex(','+Cast(id  as VarChar(10))+',',','+@strMapId+',')>0
GO
