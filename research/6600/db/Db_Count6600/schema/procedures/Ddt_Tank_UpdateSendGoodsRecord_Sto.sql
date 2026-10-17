-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_UpdateSendGoodsRecord_Sto (modified 2012-04-21T07:53:25.170)

CREATE    PROCEDURE [dbo].[Ddt_Tank_UpdateSendGoodsRecord_Sto]
@id int,
@type int
as
if( @type=1)
begin
 update db_count.dbo.Ddt_Send set static=1 where sendid=@id
end
if( @type=2)
begin
 delete from db_count.dbo.Ddt_SendDetail where id=@id
end
if( @type=3)
begin
 delete from db_count.dbo.Ddt_SendDetail where sendid in(select sendid from db_count.dbo.Ddt_Send where static=0)
 delete from db_count.dbo.Ddt_Send where sendid=0
end

GO
