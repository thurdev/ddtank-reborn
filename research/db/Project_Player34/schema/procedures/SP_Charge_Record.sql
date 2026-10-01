-- SQL_STORED_PROCEDURE dbo.SP_Charge_Record (modified 2021-06-04T05:18:34.800)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<充值信息：已废>
-- =============================================
CREATE Procedure [dbo].[SP_Charge_Record]
@Date datetime,
@Second int
as 
select PayWay as 'PayWay',sum([money]) as 'money',
sum(case when sex=1 then 1 else 0 end) as 'TotalBoy',
sum(case when sex=1 then 0 else 1 end) as 'TotalGirl',
sum(case when sex=1 then [money] else 0 end) as 'BoyTotalPay',
sum(case when sex=1 then 0 else [money] end) as 'GirlTotalPay'
from V_Charge_Money where datediff(ss,[Date],@Date)<@Second and [Date]<=@Date group by PayWay









GO
