-- VIEW dbo.tank_cPropertyGood_view (modified 2012-04-21T07:53:25.123)
create view [dbo].[tank_cPropertyGood_view]
as
SELECT * FROM db_tank_copy.dbo.shop_goods WHERE CategoryID IN (1,2,3,4,5,6,8,9,13,14,15)


GO
