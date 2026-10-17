-- SQL_STORED_PROCEDURE dbo.Ddt_countCopy_Charge_Money_Sto (modified 2012-04-21T07:53:24.780)
--作者：keny
--日期：2009-11-20
--描述：统计用户充值

CREATE PROCEDURE Ddt_countCopy_Charge_Money_Sto
@userName varchar(50),
@BeginDate  DateTime,
@EndDate DateTime
 AS
declare @Total int,
@OrderStr varchar(50)

if(@BeginDate>@EndDate)
return;

begin 
select ChargeID,UserName,[Date],CanUse,NeedMoney, sum(cast(Money as bigInt)) as Toaal 
from db_count_copy.dbo.charge_money 
where UserName=@userName and Convert(char(10),[Date],120) between @BeginDate 
and @EndDate group by UserName 
end
GO
