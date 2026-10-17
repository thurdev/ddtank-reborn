-- SQL_STORED_PROCEDURE dbo.SP_ActiveSystem_Add (modified 2015-04-22T15:56:17.603)


CREATE PROCEDURE [dbo].[SP_ActiveSystem_Add]			
            @ID int output
           ,@UserID int
           ,@useableScore int
           ,@totalScore int
           ,@AvailTime int
           ,@NickName Nvarchar (200)
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
BEGIN
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_Active_System_Data]
           ([UserID]
           ,[useableScore]
           ,[totalScore]
           ,[AvailTime]
           ,[NickName]
           ,[dayScore]
           ,[CanGetGift]
           ,[canOpenCounts]
           ,[canEagleEyeCounts]
           ,[lastFlushTime]
           ,[isShowAll]
           ,[AvtiveMoney]
           ,[activityTanabataNum]
           ,[ChallengeNum]
           ,[BuyBuffNum]
           ,[lastEnterYearMonter]
           ,[DamageNum]
           ,[BoxState]
           ,[LuckystarCoins]
           ,[CryptBoss]
           ,[DDPlayPoint]
           ,[lastEnterWorshiped]
		   ,[updateFreeCounts]
		   ,[updateWorshipedCounts]
		   ,[update200State]
		   ,[luckCount]
           ,[remainTimes]
           ,LastRefresh
           ,CurRefreshedTimes
           ,EntertamentPoint
           ,ChickActiveData)
     VALUES
           (@UserID
           ,@useableScore
           ,@totalScore
           ,@AvailTime
           ,@NickName
           ,@dayScore
           ,@CanGetGift
           ,@canOpenCounts
		   ,@canEagleEyeCounts
		   ,@lastFlushTime
		   ,@isShowAll
		   ,@AvtiveMoney
           ,@activityTanabataNum
           ,@ChallengeNum
           ,@BuyBuffNum
           ,@lastEnterYearMonter
           ,@DamageNum
           ,@BoxState
           ,@LuckystarCoins
           ,@CryptBoss
           ,@DDPlayPoint
           ,@lastEnterWorshiped
		   ,@updateFreeCounts
		   ,@updateWorshipedCounts
		   ,@update200State
		   ,@luckCount
           ,@remainTimes
           ,@LastRefresh
           ,@CurRefreshedTimes
           ,@EntertamentPoint
           ,@ChickActiveData)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END



GO
