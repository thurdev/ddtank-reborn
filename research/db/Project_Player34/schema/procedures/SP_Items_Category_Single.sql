-- SQL_STORED_PROCEDURE dbo.SP_Items_Category_Single (modified 2021-06-04T05:18:35.510)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：单个类别下的全部商品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Items_Category_Single]
@CategoryID int
AS  
 select * from Shop_Goods where CategoryID = @CategoryID







GO
