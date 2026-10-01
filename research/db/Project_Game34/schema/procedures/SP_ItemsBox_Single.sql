-- SQL_STORED_PROCEDURE dbo.SP_ItemsBox_Single (modified 2021-06-04T01:29:18.353)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：获取一条商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ItemsBox_Single]
@ID int
AS  
 select * from [Shop_Goods_Box] where [ID]=@ID









GO
