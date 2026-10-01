-- SQL_STORED_PROCEDURE dbo.SP_Items_All_ASC (modified 2021-06-04T01:29:18.310)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Items_All_ASC]
AS  
 select * from Shop_Goods order by CategoryID ASC











GO
