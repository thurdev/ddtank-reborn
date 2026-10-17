-- SQL_STORED_PROCEDURE dbo.ddt_ShowMapList_Sto (modified 2012-04-21T07:53:24.153)
--Author:keny Date:2010-01-16 Description:查询相应频道显示地图
CREATE proc ddt_ShowMapList_Sto
@strMapId nvarchar(4000)
as
select id,name,
(len(@strMapId+',')-len(replace(@strMapId+',',Cast(id  as VarChar(10)),'')))/len(Cast(id  as VarChar(10))) as counts
	from Db_Tank.dbo.Game_Map with(nolock) where (len(@strMapId+',')-len(replace(@strMapId+',',Cast(id  as VarChar(10)),'')))/len(Cast(id  as VarChar(10))) >0
	--	where  CharIndex(','+Cast(id  as VarChar(10))+',',','+@strMapId+',')>0
GO
