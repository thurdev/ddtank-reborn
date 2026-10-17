-- SQL_STORED_PROCEDURE dbo.Ddt_Count_MoneyTenThousand_Sto (modified 2012-04-21T07:53:24.687)
-- =========================================================================================
-- Author :  watson
-- Alter date : 2009-10-11
-- Description :  查询点卷数一万以上,但近两周里无充值记录的玩家ID,名称，昵称，点卷数量
-- =========================================================================================
CREATE procedure Ddt_Count_MoneyTenThousand_Sto
AS
select userid,username,nickname,money into #temp1 
from db_tank_copy..sys_users_detail where money>9999

select * from #temp1 where  username not in 
(select username from db_tank_copy..charge_money where Date>dateadd(day,-14,getdate())) 

drop table #temp1

GO
