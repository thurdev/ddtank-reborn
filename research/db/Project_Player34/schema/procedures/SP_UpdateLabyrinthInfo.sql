-- SQL_STORED_PROCEDURE dbo.SP_UpdateLabyrinthInfo (modified 2021-06-04T05:18:35.890)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateLabyrinthInfo]   
			@UserID int
           ,@myProgress int
           ,@myRanking int
           ,@completeChallenge bit
           ,@isDoubleAward bit
           ,@currentFloor int
           ,@accumulateExp int
           ,@remainTime int
           ,@currentRemainTime int
           ,@cleanOutAllTime int
           ,@cleanOutGold int
           ,@tryAgainComplete bit
           ,@isInGame bit
           ,@isCleanOut bit
           ,@serverMultiplyingPower bit
           ,@LastDate datetime
           ,@ProcessAward Nvarchar (2000)
           
 AS 
  
   begin 
	UPDATE [dbo].[Sys_Users_Labyrinth]
	SET [myProgress] = @myProgress
      ,[myRanking] = @myRanking
      ,[completeChallenge] = @completeChallenge
      ,[isDoubleAward] = @isDoubleAward
      ,[currentFloor] = @currentFloor
      ,[accumulateExp] = @accumulateExp
      ,[remainTime] = @remainTime
      ,[currentRemainTime] = @currentRemainTime
      ,[cleanOutAllTime] = @cleanOutAllTime
      ,[cleanOutGold] = @cleanOutGold
      ,[tryAgainComplete] = @tryAgainComplete
      ,[isInGame] = @isInGame
      ,[isCleanOut] = @isCleanOut
      ,[serverMultiplyingPower] = @serverMultiplyingPower
      ,[LastDate] = @LastDate
      ,[ProcessAward] = @ProcessAward
     WHERE [UserID] = @UserID
    end
    
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end




GO
