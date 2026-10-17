-- SQL_STORED_PROCEDURE dbo.Ddt_TankCopy_Charge_Money_Sto (modified 2012-04-21T07:53:24.780)
--作者：keny
--日期：2009-11-20
--描述：统计用户充值

CREATE PROCEDURE Ddt_TankCopy_Charge_Money_Sto
@userName varchar(50),
@beginDate varchar(20),
@endDate varchar(20)
 AS
if(@beginDate>@endDate)
return;

if(@userName='')
begin
	select UserName,sum(NeedMoney) as Total
	from db_tank_copy.dbo.charge_money
	where convert(char(10),[date],120) between @beginDate and @endDate
	group by UserName
	order by Total desc
end
else
begin
	select UserName,sum(NeedMoney) as Total
	from db_tank_copy.dbo.charge_money
	where UserName=@userName and  convert(char(10),[date],120) between @beginDate and @endDate
	group by UserName
	order by Total desc
end
GO
