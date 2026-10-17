-- VIEW dbo.tank_cWeaponsGood_view (modified 2012-04-21T07:53:25.123)
create view [dbo].[tank_cWeaponsGood_view]
as
SELECT * FROM db_tank_copy.dbo.shop_goods WHERE CategoryID IN (7,17)


GO
