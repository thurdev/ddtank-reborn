-- SQL_STORED_PROCEDURE dbo.DDt_UpdateRate_WithType_Sto (modified 2012-04-21T07:53:24.733)
create procedure DDt_UpdateRate_WithType_Sto
@serverid int,
@type int,
@rate int

as
update db_tank..rate set rate=@rate where serverid=@serverid and type=@type

GO
