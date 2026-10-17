-- VIEW dbo.Ddt_User_Charge_Veiw (modified 2011-04-13T00:53:18.797)
CREATE VIEW [dbo].[Ddt_User_Charge_Veiw]
AS
SELECT     CAST('' AS Varchar(50)) AS ChargeID, CAST('' AS Varchar(200)) AS UserName, CAST(0 AS Int) AS Money, CAST('2009-01-01' AS DateTime) AS Date, 
                      CAST('' AS Varchar(50)) AS CanStatic, CAST('' AS Varchar(200)) AS PayWay, CAST(0 AS decimal(10, 2)) AS NeedMoney, CAST('' AS Varchar(50)) AS IP


GO
