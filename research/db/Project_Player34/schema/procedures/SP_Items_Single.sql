-- SQL_STORED_PROCEDURE dbo.SP_Items_Single (modified 2021-06-04T05:18:35.513)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：获取一条商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Items_Single]
@ID int
AS  
 select * from Shop_Goods where TemplateID=@ID




GO
