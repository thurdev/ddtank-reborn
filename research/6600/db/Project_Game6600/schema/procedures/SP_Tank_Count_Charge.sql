-- SQL_STORED_PROCEDURE dbo.SP_Tank_Count_Charge (modified 2015-01-25T14:04:48.163)
CREATE Procedure [dbo].[SP_Tank_Count_Charge]
@AppID int,
@SubID int,
@LineID int
as
--declare @MaxID int
--select @MaxID=isnull(Max(OrderID),0) from Count_Money

declare @MaxDate datetime
select @MaxDate=isnull(Max(BuyDateTime),0) from Db_Count..Count_Money

insert into Db_Count..Count_Money(ApplicationId,SubID,LineID,UserId,PayWay,Point,NeedMoney,BuyDateTime,OrderID) 
select @AppID,@SubID,@LineID,UserName,PayWay,[Money],NeedMoney,[Date],ChargeID from Db_Tank..Charge_Money where [Date]>@MaxDate

GO
