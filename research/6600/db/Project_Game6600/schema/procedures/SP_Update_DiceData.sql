-- SQL_STORED_PROCEDURE dbo.SP_Update_DiceData (modified 2015-01-25T14:04:48.237)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Update_DiceData] 
			@ID int
           ,@UserID int
           ,@LuckIntegral int
           ,@LuckIntegralLevel int
           ,@Level int
           ,@FreeCount int
           ,@CurrentPosition int
           ,@UserFirstCell bit
           ,@AwardArray nvarchar(500)
 AS    
   begin 
UPDATE [dbo].[Dice_Data]
   SET [LuckIntegral] = @LuckIntegral
      ,[LuckIntegralLevel] = @LuckIntegralLevel
      ,[Level] = @Level
      ,[FreeCount] = @FreeCount
      ,[CurrentPosition] = @CurrentPosition
      ,[UserFirstCell] = @UserFirstCell
      ,[AwardArray] = @AwardArray
 WHERE [UserID] =@UserID
   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
