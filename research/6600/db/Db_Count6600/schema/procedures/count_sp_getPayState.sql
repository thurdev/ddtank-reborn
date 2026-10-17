-- SQL_STORED_PROCEDURE dbo.count_sp_getPayState (modified 2012-04-21T07:53:24.780)
--========================================================
--<watson>
--<依据订单号获取订单信息>
--<2010-01-25>
--========================================================
create proc count_sp_getPayState
@chargeId varchar(200)
as
begin
   select top 1 * from db_tank.dbo.charge_money where chargeid=@chargeId
end

GO
