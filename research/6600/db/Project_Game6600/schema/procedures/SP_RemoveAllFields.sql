-- SQL_STORED_PROCEDURE dbo.SP_RemoveAllFields (modified 2015-01-25T14:04:48.703)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_RemoveAllFields] 
			@UserID int                      
 AS    
   begin 
DELETE FROM [dbo].[Sys_User_Field]
             WHERE [FarmID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
