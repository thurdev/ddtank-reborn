-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserChristmas (modified 2015-01-25T14:04:48.220)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUserChristmas] 
			@ID int
		   ,@UserID int
           ,@exp int
           ,@awardState int
           ,@count int
           ,@packsNumber int
           ,@lastPacks int
           ,@gameBeginTime datetime
           ,@gameEndTime datetime
           ,@isEnter bit
           ,@dayPacks int
           ,@AvailTime int
                      
 AS    
   begin 
UPDATE [dbo].[Sys_Users_Christmas]
   SET [UserID] = @UserID
      ,[exp] = @exp
      ,[awardState] = @awardState
      ,[count] = @count
      ,[packsNumber] = @packsNumber
      ,[lastPacks] = @lastPacks
      ,[gameBeginTime] = @gameBeginTime
      ,[gameEndTime] = @gameEndTime
      ,[isEnter] = @isEnter
      ,[dayPacks] = @dayPacks 
      ,[AvailTime] = @AvailTime
 WHERE [UserID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
