-- SQL_STORED_PROCEDURE dbo.SP_GetPayState (modified 2015-01-25T14:04:48.623)
--========================================================
--<watson>
--<依据订单号获取订单信息>
--<2010-01-25>
--========================================================
CREATE proc [dbo].[SP_GetPayState]
@chargeId varchar(200)
as
begin
   select top 1 * from db_tank.dbo.charge_money where chargeid=@chargeId
end

GO
