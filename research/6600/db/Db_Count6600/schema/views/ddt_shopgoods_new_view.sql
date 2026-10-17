-- VIEW dbo.ddt_shopgoods_new_view (modified 2012-04-21T07:53:24.793)
--Author:keny   Date:2010-01-22 Description:查询所有物品
CREATE VIEW [dbo].[ddt_shopgoods_new_view]
AS
SELECT A.TemplateID AS id, A.Name, A.Description, B.Name AS Pic, A.CategoryID, 
      A.CanStrengthen, A.CanCompose, A.NeedSex
FROM Db_Tank.dbo.Shop_Goods A LEFT OUTER JOIN
      Db_Tank.dbo.Shop_Goods_Categorys B ON A.CategoryID = B.ID





GO
