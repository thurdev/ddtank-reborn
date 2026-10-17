-- SQL_STORED_PROCEDURE dbo.SP_Charge_MoenyByChargeID (modified 2012-04-21T07:53:24.640)
CREATE proc SP_Charge_MoenyByChargeID
@ChargeID nvarchar(100)
as
begin
select * from Db_Tank_Copy.dbo.Charge_Money where ChargeID=@chargeID
end


GO
