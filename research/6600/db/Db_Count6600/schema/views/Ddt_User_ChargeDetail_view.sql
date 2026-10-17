-- VIEW dbo.Ddt_User_ChargeDetail_view (modified 2012-04-21T07:53:24.873)
CREATE view [dbo].[Ddt_User_ChargeDetail_view] 
as
select B.UserID AS Id, B.NickName AS NickName, A.UserName, A.Money 
      AS moneys,A.date,B.Lastdate
FROM Db_Tank_Copy.dbo.Charge_Money A INNER JOIN
     Db_Tank_Copy.dbo.Sys_Users_Detail B ON A.UserName = B.UserName 


GO
