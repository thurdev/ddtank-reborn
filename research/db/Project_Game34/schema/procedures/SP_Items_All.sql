-- SQL_STORED_PROCEDURE dbo.SP_Items_All (modified 2021-06-04T01:29:18.307)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Items_All]
AS  
 select * from Shop_Goods order by TemplateID










GO
