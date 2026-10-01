-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Delete (modified 2021-06-04T05:18:36.160)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户删除一个物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Delete] 
 @ID int
 AS  
   begin 
     update Sys_Users_Goods set IsExist = 0 where ItemID=@ID
   end








GO
