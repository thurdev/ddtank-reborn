-- SQL_STORED_PROCEDURE dbo.SP_Items_FusionType (modified 2021-06-04T01:29:18.327)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：单个类别下的全部商品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Items_FusionType]

AS  
 select * from Shop_Goods where [FusionType] > 350 












GO
