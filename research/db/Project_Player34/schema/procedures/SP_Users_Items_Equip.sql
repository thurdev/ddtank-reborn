-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Equip (modified 2021-06-04T05:18:36.163)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：读取当前用户装备类>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Equip]
 @UserID int
 AS  
   begin 
     select top 31 * from Sys_Users_Goods  
where UserID = @UserID and IsExist = 1 and place>=0 and Place<=30 and BagType=0
   end







GO
