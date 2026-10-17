-- VIEW dbo.Count_Charge_Money_View (modified 2011-04-13T00:53:16.577)
CREATE VIEW [dbo].[Count_Charge_Money_View]
as
SELECT CAST('' AS Varchar(50)) AS ChargeID, CAST('' AS Varchar(200)) AS UserName,CAST('' AS Varchar(200)) AS NickName, CAST(0 AS Int) AS Money, CAST('2009-01-01' AS Datetime) AS Date, 
                      CAST(0 AS Bit) AS CanUse, CAST('' AS NVarchar(200)) AS PayWay, CAST(0.00 AS Numeric(18, 2)) AS NeedMoney



GO
