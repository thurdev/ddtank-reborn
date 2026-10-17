-- VIEW dbo.Ddt_User_ChargeMoney_View (modified 2012-04-21T07:53:24.903)
CREATE    VIEW [dbo].[Ddt_User_ChargeMoney_View]
AS
select u.userid as Id,max(u.nickname)as NickName,c.username,sum(c.money) as moneys,sum(c.NeedMoney) as NeedMoney,(select min(date) from
db_tank_copy.dbo.charge_money as a where a.username=u.username) as minDate,(select max(date)
from db_tank_copy.dbo.charge_money as b where b.username = u.username) as maxDate,
(select count(username) from db_tank_copy.dbo.charge_money as d where d.username=u.username) as Counts,u.LastDate as LastDate 
from db_tank_copy.dbo.charge_money as c,db_tank_copy.dbo.sys_users_detail as u where c.username = u.username 
group by c.username,u.LastDate,u.userid,u.username



GO
