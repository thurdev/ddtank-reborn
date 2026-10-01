-- SQL_STORED_PROCEDURE dbo.SP_Users_Labyrinth_Add (modified 2021-06-04T05:18:36.187)

CREATE PROCEDURE [dbo].[SP_Users_Labyrinth_Add]
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
BEGIN
    INSERT INTO [dbo].[Sys_Users_Labyrinth]
           ([UserID]
           ,[myProgress]
           ,[myRanking]
           ,[completeChallenge]
           ,[isDoubleAward]
           ,[currentFloor]
           ,[accumulateExp]
           ,[remainTime]
           ,[currentRemainTime]
           ,[cleanOutAllTime]
           ,[cleanOutGold]
           ,[tryAgainComplete]
           ,[isInGame]
           ,[isCleanOut]
           ,[serverMultiplyingPower]
           ,[LastDate]
           ,[ProcessAward])
     VALUES
           (@UserID
           ,@myProgress
           ,@myRanking
           ,@completeChallenge
           ,@isDoubleAward
           ,@currentFloor
           ,@accumulateExp
           ,@remainTime
           ,@currentRemainTime
           ,@cleanOutAllTime
           ,@cleanOutGold
           ,@tryAgainComplete
           ,@isInGame
           ,@isCleanOut
           ,@serverMultiplyingPower
           ,@LastDate
           ,@ProcessAward)                 
	if(@@error <> 0)
	begin
	  return 1
	end
END




GO
