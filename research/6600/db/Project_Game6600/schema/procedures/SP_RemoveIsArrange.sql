-- SQL_STORED_PROCEDURE dbo.SP_RemoveIsArrange (modified 2015-01-25T14:04:48.703)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_RemoveIsArrange] 
			@UserID int                      
 AS    
   begin 
UPDATE [dbo].[Sys_User_Farm]
 SET [isArrange] = 1 WHERE [FarmID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
