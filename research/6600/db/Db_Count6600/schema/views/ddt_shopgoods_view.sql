-- VIEW dbo.ddt_shopgoods_view (modified 2012-04-21T07:53:24.793)
CREATE VIEW [dbo].[ddt_shopgoods_view]
AS
SELECT     A.TemplateID AS id, A.Name, A.Description, B.Name AS Pic, A.CategoryID, A.NeedSex
FROM         Db_Tank.dbo.Shop_Goods AS A LEFT OUTER JOIN
                      Db_Tank.dbo.Shop_Goods_Categorys AS B ON A.CategoryID = B.ID


GO
