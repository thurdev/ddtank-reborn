-- SQL_STORED_PROCEDURE dbo.SP_ItemsBox_All_ASC (modified 2015-01-25T14:04:48.583)
-- =============================================
-- Author:		<XiaoV>
-- ALTER  date: <2010-01-11>
-- Description:	<商店信息：物品箱子数据>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ItemsBox_All_ASC]
AS  
 select * from Shop_Goods_Box order by ID ASC

GO
