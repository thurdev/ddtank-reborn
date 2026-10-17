-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_SendGoodsRecord_Sto (modified 2012-04-21T07:53:25.170)

CREATE PROCEDURE [dbo].[Ddt_Tank_SendGoodsRecord_Sto]
@strWhere nvarchar(100),
@userName nvarchar(20)
as
if(@userName='')
return
if(@strWhere='7roadAdmin')
begin
select b.id,a.id as aid,a.sendid,a.sender,a.receiverid,a.receiver,a.title,a.content,a.static,a.senddate,a.sendresult,b.templateid,b.goodid,b.goodname,b.goodnumber,b.validdate,b.gold,b.money,b.Lijuan,b.strengthenlevel,b.attackcompose,b.defendcompose,b.agilitycompose,b.luckcompose,b.isbind,b.issex 
from Db_Count.dbo.Ddt_Send a with(nolock) right join Db_Count.dbo.Ddt_SendDetail b with(nolock) on (a.sendid=b.sendid) where a.static=0  order by b.id desc
end
if(@strWhere='GetReceiver')
begin
select b.id,a.id as aid,a.sendid,a.sender,a.receiverid,a.receiver,a.title,a.content,a.static,a.senddate,a.sendresult,b.templateid,b.goodid,b.goodname,b.goodnumber,b.validdate,b.gold,b.money,b.Lijuan,b.strengthenlevel,b.attackcompose,b.defendcompose,b.agilitycompose,b.luckcompose,b.isbind,b.issex 
from Db_Count.dbo.Ddt_Send a with(nolock) right join Db_Count.dbo.Ddt_SendDetail b with(nolock) on (a.sendid=b.sendid) where a.static=0 and a.receiver=@userName order by b.id desc
end

if(@strWhere='aloneSend')
begin
select b.id,a.id as aid,a.sendid,a.sender,a.receiverid,a.receiver,a.title,a.content,a.static,a.senddate,a.sendresult,b.templateid,b.goodid,b.goodname,b.goodnumber,b.validdate,b.gold,b.money,b.Lijuan,b.strengthenlevel,b.attackcompose,b.defendcompose,b.agilitycompose,b.luckcompose,b.isbind,b.issex 
from Db_Count.dbo.Ddt_Send a with(nolock) right join Db_Count.dbo.Ddt_SendDetail b with(nolock) on (a.sendid=b.sendid) where a.static=0 and a.receiver=@userName order by b.id desc
end

if(@strWhere='')
begin
select b.id,a.id as aid,a.sendid,a.sender,a.receiverid,a.receiver,a.title,a.content,a.static,a.senddate,a.sendresult,b.templateid,b.goodid,b.goodname,b.goodnumber,b.validdate,b.gold,b.money,b.Lijuan,b.strengthenlevel,b.attackcompose,b.defendcompose,b.agilitycompose,b.luckcompose,b.isbind,b.issex 
from Db_Count.dbo.Ddt_Send a with(nolock) right join Db_Count.dbo.Ddt_SendDetail b with(nolock) on (a.sendid=b.sendid) where a.static=0 order by b.id desc
end
/*
else
begin
select b.id,a.id as aid,a.sendid,a.sender,a.receiverid,a.receiver,a.title,a.content,a.static,a.senddate,a.sendresult,b.templateid,b.goodid,b.goodname,b.goodnumber,b.validdate,b.gold,b.money,b.Lijuan,b.strengthenlevel,b.attackcompose,b.defendcompose,b.agilitycompose,b.luckcompose,b.isbind,b.issex 
from Db_Count.dbo.Ddt_Send  a with(nolock) right join Db_Count.dbo.Ddt_SendDetail b with(nolock) on(a.sendid=b.sendid) where a.sender=@userName and a.static=@strWhere order by b.id desc
end*/

GO
