-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Single (modified 2021-06-04T05:18:36.173)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：读取一条物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Single]
 @ID int
 AS  
   begin 
     select * from Sys_Users_Goods  
where ItemID = @ID and IsExist = 1
   end








GO
