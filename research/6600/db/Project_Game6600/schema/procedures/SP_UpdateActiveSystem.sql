-- SQL_STORED_PROCEDURE dbo.SP_UpdateActiveSystem (modified 2015-04-22T15:56:26.143)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateActiveSystem] 
			@ID int
		   ,@UserID int
           ,@useableScore int
           ,@totalScore int
           ,@AvailTime int 
           ,@NickName nvarchar(200)
           ,@CanGetGift bit
           ,@canOpenCounts int
		   ,@canEagleEyeCounts int
		   ,@lastFlushTime datetime
		   ,@isShowAll bit
		   ,@AvtiveMoney int
		   ,@activityTanabataNum int
		   ,@ChallengeNum int
		   ,@BuyBuffNum int
		   ,@lastEnterYearMonter datetime
		   ,@DamageNum int
		   ,@BoxState nvarchar (50)
		   ,@LuckystarCoins int
		   ,@CryptBoss nvarchar (2500)
		   ,@dayScore int
		   ,@DDPlayPoint int
		   ,@lastEnterWorshiped datetime
		   ,@updateFreeCounts int
		   ,@updateWorshipedCounts int
		   ,@update200State int
		   ,@luckCount int
		   ,@remainTimes int
		   ,@LastRefresh datetime
		   ,@CurRefreshedTimes int
		   ,@EntertamentPoint int
		   ,@ChickActiveData nvarchar (max)
 AS    
   begin 
UPDATE [dbo].[Sys_Active_System_Data]
   SET [useableScore] = @useableScore
      ,[totalScore] = @totalScore
      ,[AvailTime] = @AvailTime
      ,[NickName] = @NickName
      ,[dayScore] = @dayScore
      ,[CanGetGift] = @CanGetGift
      ,[canOpenCounts] = @canOpenCounts
      ,[canEagleEyeCounts] = @canEagleEyeCounts
      ,[lastFlushTime] = @lastFlushTime
      ,[isShowAll] = @isShowAll
      ,[AvtiveMoney] = @AvtiveMoney
      ,[activityTanabataNum] = @activityTanabataNum
      ,[ChallengeNum] = @ChallengeNum
      ,[BuyBuffNum] = @BuyBuffNum
      ,[lastEnterYearMonter] = @lastEnterYearMonter
      ,[DamageNum] = @DamageNum
      ,[BoxState] = @BoxState
      ,[LuckystarCoins] = @LuckystarCoins
      ,[CryptBoss] = @CryptBoss
      ,[DDPlayPoint] = @DDPlayPoint
      ,[lastEnterWorshiped] = @lastEnterWorshiped
      ,[updateFreeCounts] = @updateFreeCounts
      ,[updateWorshipedCounts] = @updateWorshipedCounts
      ,[update200State] = @update200State
      ,[luckCount] = @luckCount
      ,[remainTimes] = @remainTimes
      ,[LastRefresh] = @LastRefresh
      ,[CurRefreshedTimes] = @CurRefreshedTimes
      ,[EntertamentPoint] = @EntertamentPoint
      ,[ChickActiveData] = @ChickActiveData
 WHERE [UserID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end



GO
