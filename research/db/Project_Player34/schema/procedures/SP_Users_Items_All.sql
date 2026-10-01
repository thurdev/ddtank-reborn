-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_All (modified 2021-06-04T05:18:36.150)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取当前用户全部有效物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_All]
 @UserID int
 AS  
   begin 
     select * from Sys_Users_Goods  
where UserID = @UserID and IsExist = 1 and place>=0
   end








GO
