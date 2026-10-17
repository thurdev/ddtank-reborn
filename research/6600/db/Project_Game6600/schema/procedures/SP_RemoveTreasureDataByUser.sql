-- SQL_STORED_PROCEDURE dbo.SP_RemoveTreasureDataByUser (modified 2015-01-25T14:04:48.400)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_RemoveTreasureDataByUser] 
			@UserID int                      
 AS    
   begin 
UPDATE [dbo].[Treasure_Data]
 SET [IsExit] = 0 WHERE [UserID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
