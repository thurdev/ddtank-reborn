-- SQL_STORED_PROCEDURE dbo.SP_ShopGoodsShowList_All (modified 2015-01-25T14:04:48.680)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<字弹信息：显示全部记录>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ShopGoodsShowList_All]
AS  
 select *  from dbo.ShopGoodsShowList

GO
