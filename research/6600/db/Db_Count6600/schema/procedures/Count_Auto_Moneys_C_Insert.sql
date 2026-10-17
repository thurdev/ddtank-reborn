-- SQL_STORED_PROCEDURE dbo.Count_Auto_Moneys_C_Insert (modified 2012-04-21T07:53:25.153)


CREATE  proc Count_Auto_Moneys_C_Insert
as
begin
select convert(varchar(10),getdate(),120) as DateT,sum(money) as playerMoneys,max(money) as playerMaxMoney,min(money) as playerMinMoney
into #temp1  
from db_tank_copy.dbo.sys_users_detail 

--返回付款 6 竞标失败 5 拍卖失败 3
declare @beginTime datetime
set @beginTime=getdate()-1
select convert(varchar(10),getdate(),120) as date2,sum(money) as mailMoneys,max(money) as mailMaxMoney,min(money) as mailMinMoney
into #temp2
from db_tank_copy.dbo.user_messages where type in (2,5,6) and sendtime>@beginTime

select convert(varchar(10),getdate(),120) as date3,sum(money) as chargeMoneys,max(money) as chargeMaxMoney,min(money) as chargeMinMoney
into #temp3
from db_tank_copy.dbo.charge_money where date>getdate()-1 and date<getdate()

insert into db_count.dbo.Count_Money_C 
select c.*,d.chargeMoneys,d.chargeMaxMoney,d.chargeMinMoney from (
select a.*,b.mailMoneys,b.mailMaxMoney,b.mailMinMoney from #temp1 a left join #temp2 b  on a.DateT=b.date2)
 as c left join #temp3 d on c.DateT=d.date3  

drop table #temp1
drop table #temp2
drop table #temp3
end
GO
