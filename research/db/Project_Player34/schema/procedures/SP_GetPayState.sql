-- SQL_STORED_PROCEDURE dbo.SP_GetPayState (modified 2021-06-04T05:18:35.433)




--========================================================
--<watson>
--<依据订单号获取订单信息>
--<2010-01-25>
--========================================================
CREATE proc [dbo].[SP_GetPayState]
@chargeId varchar(200)
as
begin
   select top 1 * from dbo.charge_money where chargeid=@chargeId
end







GO
