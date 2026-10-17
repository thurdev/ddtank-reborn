-- SQL_STORED_PROCEDURE dbo.Pay_Info_Post (modified 2012-04-21T07:54:31.047)
CREATE PROCEDURE  Pay_Info_Post 
@OrderId Varchar(20)
AS
/*得到当前订单提交的给果*/
Update     Pay_Info  Set IsPass=1 ,  LastDateTime=GetDate() Where  OrderId=@OrderId And IsPass=0
GO
