-- SQL_STORED_PROCEDURE dbo.SP_PayState (modified 2021-06-04T05:18:35.613)


-- =============================================
-- Author:<Watson>
-- ALTER  date: <2009-11-25>
-- Description:	<订单查询：1存在，0不存在>
-- =============================================
CREATE Procedure [dbo].[SP_PayState]
@chargeId varchar(50)
as
begin
select count(*) as state from dbo.charge_money where chargeId=@chargeId
end







GO
