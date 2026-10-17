-- SQL_STORED_PROCEDURE dbo.SP_Drop_Item_All (modified 2015-01-25T14:04:48.523)
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
