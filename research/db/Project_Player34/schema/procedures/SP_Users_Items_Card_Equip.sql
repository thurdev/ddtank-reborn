-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Card_Equip (modified 2021-06-04T05:18:36.153)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：读取当前用户装备类>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Card_Equip]
 @UserID int
 AS  
   begin 
     select * from Sys_Users_Card
where UserID = @UserID and place < 5
   end








GO
