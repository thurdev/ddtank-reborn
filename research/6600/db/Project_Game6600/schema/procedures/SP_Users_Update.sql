-- SQL_STORED_PROCEDURE dbo.SP_Users_Update (modified 2025-11-27T19:59:18.480)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户信息更新，从内存中更新到DB中，采用定时或离开时操作>
-- =============================================
CREATE Procedure [dbo].[SP_Users_Update]
@UserID int,
@Attack int,
@Defence int,
@Luck int,
@Agility int,
@Gold int,
@Money int,
@Style Nvarchar(200),
@Colors Nvarchar(200),
@Hide int,
@Grade int,
@GP int,
@State int,
@ConsortiaID int,
@ExpendDate datetime,
@Win int,
@Total int,
@Escape int,
@Skin Nvarchar(50),
@Offer int,
@AntiAddiction int output,
@RichesOffer int,
@RichesRob int,
@CheckCount int output,
@MarryInfoID int,
@DayLoginCount int,
@Nimbus int,
@LastAward datetime,
@GiftToken int,
@QuestSite  varbinary(200),
@PvePermission nvarchar(50),
@FightPower int,
@AnswerSite int,
@LastAuncherAward datetime,
@hp int,
@ChatCount int ,
@SpaPubGoldRoomLimit int ,
@LastSpaDate DateTime ,
@FightLabPermission nvarchar(50) ,
@SpaPubMoneyRoomLimit int ,
@IsInSpaPubGoldToday bit ,
@IsInSpaPubMoneyToday bit ,
@AchievementPoint int ,			
@LastWeekly datetime , 
@LastWeeklyVersion int , 
@GiftGp int , 
@GiftLevel int , 
@IsOpenGift bit ,  
@WeaklessGuildProgressStr nvarchar(1000),
@IsOldPlayer bit,
@VIPLevel int,
@VIPExp int,
@Score int
,@OptionOnOff int
,@isOldPlayerHasValidEquitAtLogin bit
,@badLuckNumber int
,@luckyNum int
,@lastLuckyNumDate datetime
,@lastLuckNum int
,@CardSoul int
,@uesedFinishTime int
,@totemId int
,@damageScores int
,@petScore int
,@IsShowConsortia bit 
,@LastRefreshPet datetime
,@GetSoulCount int
,@isFirstDivorce int
,@needGetBoxTime int
,@myScore int  
,@TimeBox datetime
,@IsFistGetPet bit
,@MaxBuyHonor int
,@Medal int 
,@myHonor int 
,@LeagueMoney int
,@Honor nvarchar(50) 
,@necklaceExp int
,@necklaceExpAdd int
,@hardCurrency int
,@accumulativeLoginDays int
,@accumulativeAwardDays int
,@PveEpicPermission nvarchar(50) 
,@evolutionGrade int
,@evolutionExp int
,@MagicAttack int
,@MagicDefence int
,@honorId int
,@horseRaceCanRaceTime int
as

declare @IsExist bit
declare @ForbidDate datetime
declare @OrdState int
declare @AntiDate datetime
declare @OnlineTime int
set @OnlineTime =0
select @OrdState=State,@AntiDate=AntiDate,@AntiAddiction=AntiAddiction,@ForbidDate=ForbidDate,@IsExist=IsExist from Sys_Users_Detail where UserID=@UserID

if DAY(@AntiDate)<>DAY(getdate())
begin
	set @AntiDate=getdate()
	set @AntiAddiction=0
	set @CheckCount=0
end
else
begin
	if @OrdState<>0 
	begin
	set @OnlineTime = isnull(datediff(mi,@AntiDate,Getdate()),0)
	set @AntiAddiction =@AntiAddiction + @OnlineTime
	           end
	set @AntiDate=getdate()
end

set xact_abort on
begin tran

if @ExpendDate = ''
begin 
	
 		 update Sys_Users_Detail set Gold = @Gold,Money = @Money,Style=@Style,Colors=@Colors,Grade=@Grade,GP=@GP,State=@State,
		AntiDate=@AntiDate,OnlineTime = OnlineTime + @OnlineTime,RichesOffer=@RichesOffer,RichesRob=@RichesRob,ForbidDate=@ForbidDate,IsExist=@IsExist,
		Hide=@Hide,Win=@Win,Total=@Total,[Escape]=@Escape,Skin=@Skin,Offer=@Offer,AntiAddiction = @AntiAddiction,CheckCount=@CheckCount,MarryInfoID=@MarryInfoID,
		DayLoginCount=@DayLoginCount ,Nimbus=@Nimbus,LastAward=@LastAward,GiftToken=@GiftToken,QuestSite=@QuestSite,PvePermission=@PvePermission,FightPower=@FightPower,
		AnswerSite=@AnswerSite,LastAuncherAward=@LastAuncherAward,
		Medal = @Medal ,
		ChatCount =	@ChatCount ,
		SpaPubGoldRoomLimit = @SpaPubGoldRoomLimit ,
		LastSpaDate  = @LastSpaDate  ,
		FightLabPermission = @FightLabPermission  ,
		SpaPubMoneyRoomLimit = @SpaPubMoneyRoomLimit ,
		IsInSpaPubGoldToday = @IsInSpaPubGoldToday  ,
		IsInSpaPubMoneyToday = @IsInSpaPubMoneyToday ,
		AchievementPoint = @AchievementPoint ,			
		LastWeekly = @LastWeekly,           
		LastWeeklyVersion = @LastWeeklyVersion , 
		GiftGp = @GiftGp ,           
		GiftLevel = @GiftLevel , 
		IsOpenGift = @IsOpenGift ,  
		WeaklessGuildProgressStr = @WeaklessGuildProgressStr,
		IsOldPlayer = @IsOldPlayer,
		[Score] = @Score
      ,[OptionOnOff] = @OptionOnOff
      ,[isOldPlayerHasValidEquitAtLogin] = @isOldPlayerHasValidEquitAtLogin
      ,[badLuckNumber] = @badLuckNumber
      ,[luckyNum] = @luckyNum
      ,[lastLuckyNumDate] = @lastLuckyNumDate
      ,[lastLuckNum] = @lastLuckNum
      ,[CardSoul] = @CardSoul
      ,[uesedFinishTime] = @uesedFinishTime
      ,[totemId] = @totemId
      ,[damageScores] = @damageScores
      ,[petScore] = @petScore
      ,[IsShowConsortia] = @IsShowConsortia
      ,[LastRefreshPet] =@LastRefreshPet
      ,[GetSoulCount] =@GetSoulCount
      ,[isFirstDivorce] =@isFirstDivorce
      ,needGetBoxTime= @needGetBoxTime
      ,[myScore] =@myScore
      ,[TimeBox]=@TimeBox
      ,[IsFistGetPet] = @IsFistGetPet
      ,[myHonor] =@myHonor
      ,[MaxBuyHonor] = @MaxBuyHonor
      ,[LeagueMoney] = @LeagueMoney
      ,[Honor] =@Honor
      ,[necklaceExp] = @necklaceExp
      ,[necklaceExpAdd] = @necklaceExpAdd
      ,[hardCurrency] = @hardCurrency 
      ,[accumulativeLoginDays] = @accumulativeLoginDays
      ,[accumulativeAwardDays] = @accumulativeAwardDays
      ,[PveEpicPermission] = @PveEpicPermission
      ,[evolutionGrade] = @evolutionGrade
      ,[evolutionExp] = @evolutionExp   
      ,honorId = @honorId   
      ,horseRaceCanRaceTime = @horseRaceCanRaceTime
		where UserID = @UserID
end
else
begin
  		update Sys_Users_Detail set Gold = @Gold,Money = @Money,Style=@Style,Colors=@Colors,Grade=@Grade,GP=@GP,State=@State,
		AntiDate=@AntiDate,OnlineTime = OnlineTime + @OnlineTime,RichesOffer=@RichesOffer,RichesRob=@RichesRob,ForbidDate=@ForbidDate,IsExist=@IsExist,
		Hide=@Hide,ExpendDate=@ExpendDate,Win=@Win,Total=@Total,[Escape]=@Escape,Skin=@Skin,Offer=@Offer,AntiAddiction = @AntiAddiction,CheckCount=@CheckCount,MarryInfoID=@MarryInfoID,
        DayLoginCount=@DayLoginCount ,Nimbus=@Nimbus,LastAward=@LastAward,GiftToken=@GiftToken,QuestSite=@QuestSite,PvePermission=@PvePermission,FightPower=@FightPower,
        AnswerSite=@AnswerSite,LastAuncherAward=@LastAuncherAward,
        Medal = @Medal ,
		ChatCount =	@ChatCount ,
		SpaPubGoldRoomLimit = @SpaPubGoldRoomLimit ,
		LastSpaDate  = @LastSpaDate  ,
		FightLabPermission = @FightLabPermission  ,
		SpaPubMoneyRoomLimit = @SpaPubMoneyRoomLimit ,
		IsInSpaPubGoldToday = @IsInSpaPubGoldToday  ,
		IsInSpaPubMoneyToday = @IsInSpaPubMoneyToday ,
		AchievementPoint = @AchievementPoint ,			
		LastWeekly = @LastWeekly,           
		LastWeeklyVersion = @LastWeeklyVersion , 
		GiftGp = @GiftGp ,           
		GiftLevel = @GiftLevel , 
		IsOpenGift = @IsOpenGift ,  
		WeaklessGuildProgressStr = @WeaklessGuildProgressStr,
		IsOldPlayer = @IsOldPlayer,
		[Score] = @Score
      ,[OptionOnOff] = @OptionOnOff
      ,[isOldPlayerHasValidEquitAtLogin] = @isOldPlayerHasValidEquitAtLogin
      ,[badLuckNumber] = @badLuckNumber
      ,[luckyNum] = @luckyNum
      ,[lastLuckyNumDate] = @lastLuckyNumDate
      ,[lastLuckNum] = @lastLuckNum
      ,[CardSoul] = @CardSoul
      ,[uesedFinishTime] = @uesedFinishTime
      ,[totemId] = @totemId
      ,[damageScores] = @damageScores
      ,[petScore] = @petScore
      ,[IsShowConsortia] = @IsShowConsortia
      ,[LastRefreshPet] =@LastRefreshPet
      ,[GetSoulCount] =@GetSoulCount
      ,[isFirstDivorce] =@isFirstDivorce
      ,needGetBoxTime= @needGetBoxTime
      ,[myScore] =@myScore      
      ,[TimeBox]=@TimeBox
      ,[IsFistGetPet] = @IsFistGetPet
      ,[myHonor] =@myHonor
      ,[MaxBuyHonor] = @MaxBuyHonor
      ,[LeagueMoney] = @LeagueMoney
      ,[Honor] =@Honor
      ,[necklaceExp] = @necklaceExp
      ,[necklaceExpAdd] = @necklaceExpAdd 
      ,[hardCurrency] = @hardCurrency 
      ,[accumulativeLoginDays] = @accumulativeLoginDays
      ,[accumulativeAwardDays] = @accumulativeAwardDays
      ,[PveEpicPermission] = @PveEpicPermission
      ,[evolutionGrade] = @evolutionGrade
      ,[evolutionExp] = @evolutionExp
      ,honorId = @honorId  
      ,horseRaceCanRaceTime= @horseRaceCanRaceTime 
        where UserID = @UserID
end

if @@error <> 0
begin
  rollback tran
  return @@error
end

update Sys_Users_Fight 
set 
Attack=@Attack,
Defence=@Defence,
Luck=@Luck,
Agility=@Agility,
hp=@hp,
MagicAttack=@MagicAttack,
MagicDefence=@MagicDefence
where UserID = @UserID
if @@error <> 0
begin 
  rollback tran
  return @@error
end
--/*
update Sys_VIP_Info set VIPLevel=@VIPLevel, VIPExp=@VIPExp where UserID = @UserID
if @@error <> 0
begin 
  rollback tran
  return @@error
end
--*/
commit tran
set xact_abort off
return 0


GO
