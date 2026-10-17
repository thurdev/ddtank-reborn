-- SQL_STORED_PROCEDURE dbo.SP_PayState (modified 2015-01-25T14:04:48.657)
-- =============================================
-- Author:<Watson>
-- ALTER  date: <2009-11-25>
-- Description:	<订单查询：1存在，0不存在>
-- =============================================
CREATE Procedure [dbo].[SP_PayState]
@chargeId varchar(50)
as
begin
select count(*) as state from db_tank.dbo.charge_money where chargeId=@chargeId
end

GO
