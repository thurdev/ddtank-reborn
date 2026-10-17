-- SQL_STORED_PROCEDURE dbo.Ddtc_Charge_Money_Month_Sto (modified 2012-04-21T07:53:24.467)




CREATE   PROCEDURE [dbo].[Ddtc_Charge_Money_Month_Sto] 
@Begin_Date DateTime, 
@End_Date DateTime
AS
Select Convert(Char(7),Date,120) As RegMonth,Sum(NeedMoney) As Total   From Db_Tank.dbo.Charge_Money with(nolock)
   Where Date>=@Begin_Date And Date<=@End_Date  
  
   Group By Convert(Char(7),Date,120)
   Order By RegMonth






GO
