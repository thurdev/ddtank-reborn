-- SQL_STORED_PROCEDURE dbo.Pay_Card_Info (modified 2012-04-21T07:54:31.077)


CREATE   PROCEDURE  Pay_Card_Info
@OrderId  Varchar(20)
AS
Select Top 1 * From Pay_Card Where  OrderId=@OrderId


GO
