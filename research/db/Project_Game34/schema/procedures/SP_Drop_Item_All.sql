-- SQL_STORED_PROCEDURE dbo.SP_Drop_Item_All (modified 2021-06-04T01:29:17.927)



-- =============================================
-- Author:		<Xiaov>
-- ALTER  date: <2009-11-19>
-- Description:	<掉落信息：掉落物品表>
-- =============================================
CREATE   PROCEDURE [dbo].[SP_Drop_Item_All]
 AS  
   begin 
     select * from Drop_Item
   end







GO
