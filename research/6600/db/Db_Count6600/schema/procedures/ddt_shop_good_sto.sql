-- SQL_STORED_PROCEDURE dbo.ddt_shop_good_sto (modified 2012-04-21T07:53:25.123)
--创建人：keny  创建日期：2009-12-07 描述：查询商品名称和ID
CREATE proc ddt_shop_good_sto
AS
SELECT TemplateID, Name
FROM Db_Tank_Copy.dbo.Shop_Goods
GO
