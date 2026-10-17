-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_SendGoods_Sto (modified 2012-04-21T07:53:24.793)
CREATE PROC Ddt_Tank_SendGoods_Sto
@str varchar(20)

AS
IF (@str IS NULL)
RETURN
--查询所有武器
IF (@str='Weapons')
SELECT * FROM db_count.dbo.ddt_shopgoods_new_view WHERE CategoryID IN (7,17)
--查询所有装备
IF (@str='Equipment')
SELECT * FROM db_count.dbo.ddt_shopgoods_new_view WHERE CategoryID IN (1,2,3,4,5,6,8,9,13,14,15)
--查询所有道具
IF (@str='Props')
SELECT * FROM db_count.dbo.ddt_shopgoods_new_view WHERE CategoryID IN (10,11,16)

GO
