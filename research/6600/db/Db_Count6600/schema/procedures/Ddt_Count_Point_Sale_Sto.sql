-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Point_Sale_Sto (modified 2012-04-21T07:53:24.640)
CREATE  PROCEDURE [dbo].[Ddt_Count_Point_Sale_Sto] 
@Begin_Date DateTime, 
@End_Date DateTime
AS

Select Cast(RegDate As DateTime) As RegDate,Total From(
Select  Convert(Char(10),EnterTime,120)  As RegDate,Sum(Cast(Moneys as bigint))As Total  From db_logs.dbo.Log_Money
       Where   @Begin_Date <=Convert(Char(10), EnterTime,120)
               And @End_Date>=Convert(Char(10),EnterTime,120)
               And Moneys>0
     Group By  Convert(Char(10),EnterTime,120)) A
     Order By RegDate

GO
