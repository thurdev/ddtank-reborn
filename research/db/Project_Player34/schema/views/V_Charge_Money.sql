-- VIEW dbo.V_Charge_Money (modified 2020-12-11T12:41:32.920)



CREATE VIEW [dbo].[V_Charge_Money]
AS
SELECT dbo.Charge_Money.PayWay, dbo.Charge_Money.Money, 
      dbo.Sys_Users_Detail.Sex, dbo.Charge_Money.[Date]
FROM dbo.Charge_Money INNER JOIN
      dbo.Sys_Users_Detail ON 
      dbo.Charge_Money.UserName = dbo.Sys_Users_Detail.UserName






GO
