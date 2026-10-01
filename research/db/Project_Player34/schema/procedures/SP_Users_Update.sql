-- SQL_STORED_PROCEDURE dbo.SP_Users_Update (modified 2022-08-17T20:57:56.813)






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
    @WeaklessGuildProgressStr nvarchar(1000),
    @IsOldPlayer bit,
    @VIPLevel int,
    @VIPExp int,
    @Score int,
	   @OptionOnOff int
      ,@isOldPlayerHasValidEquitAtLogin bit
      ,@badLuckNumber int
      ,@luckyNum int
      ,@lastLuckyNumDate datetime
      ,@lastLuckNum int
      ,@IsShowConsortia bit
      ,@NewDay datetime
      ,@Medal int
      ,@Honor nvarchar(50)
	  ,@VIPNextLevelDaysNeeded int
	  ,@IsRecharged bit
	  ,@IsGetAward bit
	  ,@typeVIP int
	  ,@evolutionGrade int
	  ,@evolutionExp int
	  ,@hardCurrency int
	  ,@EliteScore int
	  ,@UseOffer int
	  ,@ShopFinallyGottenTime datetime
	  ,@MoneyLock int
	  ,@LastGetEgg datetime
	  ,@IsFistGetPet bit
	  ,@LastRefreshPet datetime
	  ,@petScore int
	  ,@accumulativeLoginDays int
      ,@accumulativeAwardDays int
	  ,@honorId int
	  ,@Repute int
	  ,@damageScores int
	  ,@totemId int
	  ,@myHonor int
	  ,@MaxBuyHonor int
	  ,@necklaceExp int
	  ,@necklaceExpAdd int
	  ,@GhostEquipList nvarchar(max)
	  ,@fineSuitExp int
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
		WeaklessGuildProgressStr = @WeaklessGuildProgressStr,
		IsOldPlayer = @IsOldPlayer,
		[Score] = @Score,
		[OptionOnOff] = @OptionOnOff
      ,[isOldPlayerHasValidEquitAtLogin] = @isOldPlayerHasValidEquitAtLogin
      ,[badLuckNumber] = @badLuckNumber
      ,[luckyNum] = @luckyNum
      ,[lastLuckyNumDate] = @lastLuckyNumDate
      ,[lastLuckNum] = @lastLuckNum
      ,[IsShowConsortia] = @IsShowConsortia
      ,[NewDay]=@NewDay
      ,[Honor] =@Honor
	  ,IsRecharged = @IsRecharged
	  ,IsGetAward = @IsGetAward
	  ,evolutionGrade = @evolutionGrade
	  ,evolutionExp = @evolutionExp
	  ,hardCurrency = @hardCurrency
	  ,EliteScore = @EliteScore
	  ,UseOffer = @UseOffer
	  ,ShopFinallyGottenTime = @ShopFinallyGottenTime
	  ,MoneyLock = @MoneyLock
	  ,LastGetEgg = @LastGetEgg
	  ,IsFistGetPet = @IsFistGetPet
	  ,LastRefreshPet =@LastRefreshPet
	  ,petScore = @petScore
      ,[accumulativeLoginDays] = @accumulativeLoginDays
      ,[accumulativeAwardDays] = @accumulativeAwardDays
	  ,honorId = @honorId  
	  ,Repute = @Repute
	  ,damageScores = @damageScores
	  ,totemId= @totemId
	  ,myHonor = @myHonor
	  ,MaxBuyHonor = @MaxBuyHonor
	  ,necklaceExp = @necklaceExp
	  ,necklaceExpAdd = @necklaceExpAdd
	  ,GhostEquipList = @GhostEquipList
	  ,fineSuitExp = @fineSuitExp
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
		WeaklessGuildProgressStr = @WeaklessGuildProgressStr,
		IsOldPlayer = @IsOldPlayer,
		[Score] = @Score,
		[OptionOnOff] = @OptionOnOff
      ,[isOldPlayerHasValidEquitAtLogin] = @isOldPlayerHasValidEquitAtLogin
      ,[badLuckNumber] = @badLuckNumber
      ,[luckyNum] = @luckyNum
      ,[lastLuckyNumDate] = @lastLuckyNumDate
      ,[lastLuckNum] = @lastLuckNum
      ,[IsShowConsortia] = @IsShowConsortia
      ,[NewDay]=@NewDay
      ,[Honor] =@Honor
	   ,IsRecharged = @IsRecharged
	  ,IsGetAward = @IsGetAward
	  ,evolutionGrade = @evolutionGrade
	  ,evolutionExp = @evolutionExp
	  ,hardCurrency = @hardCurrency
	  ,EliteScore = @EliteScore
	  ,UseOffer = @UseOffer
	  ,ShopFinallyGottenTime = @ShopFinallyGottenTime
	  ,MoneyLock = @MoneyLock
	  ,LastGetEgg = @LastGetEgg
	  ,IsFistGetPet = @IsFistGetPet
	  ,LastRefreshPet =@LastRefreshPet
	  ,petScore = @petScore
      ,[accumulativeLoginDays] = @accumulativeLoginDays
      ,[accumulativeAwardDays] = @accumulativeAwardDays
	  ,honorId = @honorId  
	  ,Repute = @Repute
	  ,damageScores = @damageScores
	  ,totemId= @totemId
	  ,myHonor = @myHonor
	  ,MaxBuyHonor = @MaxBuyHonor
	  ,necklaceExp = @necklaceExp
	  ,necklaceExpAdd = @necklaceExpAdd
	  ,GhostEquipList = @GhostEquipList
	  ,fineSuitExp = @fineSuitExp
        where UserID = @UserID
end

if @@error <> 0
begin
  rollback tran
  return @@error
end

update Sys_Users_Fight set Attack=@Attack,Defence=@Defence,Luck=@Luck,Agility=@Agility,hp=@hp where UserID = @UserID
if @@error <> 0
begin 
  rollback tran
  return @@error
end
--/*
update Sys_VIP_Info set VIPLevel=@VIPLevel, VIPExp=@VIPExp, VIPNextLevelDaysNeeded=@VIPNextLevelDaysNeeded, typeVIP = @typeVIP where UserID = @UserID
if @@error <> 0
begin 
  rollback tran
  return @@error
end
--*/
update Sys_Users_Extra set TotalCaddyOpen = @badLuckNumber where UserID = @UserID
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
