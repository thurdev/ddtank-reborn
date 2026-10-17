-- SQL_STORED_PROCEDURE dbo.Ddtc_Charge_Money_Day_Sto (modified 2012-04-21T07:53:24.543)




CREATE   PROCEDURE [dbo].[Ddtc_Charge_Money_Day_Sto] 
@Month_Date Varchar(7)
AS
Select  *   From Db_Tank.dbo.Charge_Money with(nolock)
   Where Convert(Char(7),Date,120)=@Month_Date 
   Order By Date





GO
