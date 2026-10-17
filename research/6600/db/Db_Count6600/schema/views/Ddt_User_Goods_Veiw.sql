-- VIEW dbo.Ddt_User_Goods_Veiw (modified 2011-04-13T00:53:18.797)
CREATE VIEW [dbo].[Ddt_User_Goods_Veiw]
AS
SELECT     CAST('' AS Varchar(20)) AS ItemPlace, CAST(0 AS Int) AS BagType, CAST(0 AS Int) AS Place, CAST(0 AS Int) AS COUNT, CAST(0 AS int) 
                      AS StrengthenLevel, CAST(0 AS int) AS AttackCompose, CAST(0 AS int) AS DefendCompose, CAST(0 AS int) AS LuckCompose, CAST(0 AS int) 
                      AS AgilityCompose, CAST('2009-01-01' AS DateTime) AS BeginDate, CAST(0 AS int) AS ValidDate, CAST(0 AS Bit) AS IsExist, CAST('' AS Varchar(100)) 
                      AS GoodsName, CAST(0 AS int) AS TemplateID, CAST(0 AS bit) AS IsBinds, CAST(0 AS bit) AS IsUsed, CAST(GETDATE() AS datetime) AS RemoveDate, 
                      CAST(0 AS int) AS RemoveType,CAST('' AS Varchar(50)) AS Hole1,CAST('' AS Varchar(50)) AS Hole2,CAST('' AS varchar(50)) AS Hole3




GO
