-- SQL_STORED_PROCEDURE dbo.Ddt_GoodsSendDetail_Sto (modified 2012-04-21T07:53:25.153)

CREATE  PROCEDURE  [dbo].[Ddt_GoodsSendDetail_Sto]
-- Author:andy -- Date:2009-09-01  -- Description:查询后台物品赠送记录详情
  @Begin_Date DateTime, 
  @End_Date DateTime
  AS
BEGIN
select a.id,a.sendid,a.sender,a.receiverid,a.receiver,a.senddate,a.sendresult,a.content,a.static,
b.goodid,b.goodname,b.goodnumber,b.templateid,b.validdate,b.gold,b.money,b.Lijuan,b.strengthenlevel,b.attackcompose,
b.defendcompose,b.agilitycompose,b.luckcompose,b.isbind,b.issex into #temp1
from db_count.dbo.Ddt_Send a with(nolock) left join db_count.dbo.Ddt_SendDetail b with(nolock)
on(a.sendid=b.sendid)
where a.static=1 and senddate>@Begin_Date and senddate<=@End_Date order by a.sendid desc

Select Top 0 * From Ddt_GoodsSendDetail_View Union All select * from #temp1

  Select Top 0 * From Ddt_GoodsSendNumber_Empty_View Union All 
select goodid,goodname,sum(goodnumber) from #temp1 group by goodid,goodname

drop table #temp1
END

GO
