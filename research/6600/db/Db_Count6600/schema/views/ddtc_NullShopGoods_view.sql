-- VIEW dbo.ddtc_NullShopGoods_view (modified 2011-04-13T00:53:18.827)

CREATE view [dbo].[ddtc_NullShopGoods_view]
as
SELECT     CAST(0 AS Int) AS TemplateID, CAST(0 AS Int) AS NeedSex, CAST(0 AS Int) AS CategoryID, CAST('' AS Varchar(200)) AS Name, CAST(1 AS bit) 
                      AS CanStrengthen, CAST(1 AS bit) AS CanCompose


GO
