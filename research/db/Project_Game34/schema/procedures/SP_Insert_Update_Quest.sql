-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Quest (modified 2021-06-04T01:29:18.190)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Quest] 
		   @ID int,
           @QuestID int,
           @Title nvarchar(300),
           @Detail nvarchar(1500),
           @Objective nvarchar(50),
           @NeedMinLevel int,
           @NeedMaxLevel int,
           @PreQuestID nvarchar(40),
           @NextQuestID nvarchar(40),
           @IsOther int,
           @CanRepeat bit,
           @RepeatInterval int,
           @RepeatMax int,
           @RewardGP int,
           @RewardGold int,
           @RewardGiftToken int,
           @RewardOffer int,
           @RewardRiches int,
           @RewardBuffID int,
           @RewardBuffDate int,
           @RewardMoney int,
           @Rands numeric(18,2),
           @RandDouble int,
           @TimeMode bit,
           @StartDate datetime,
           @EndDate datetime,
           @MapID int,
           @AutoEquip bit,
           @RewardMedal int,
           @Rank nvarchar(40),
           @StarLev int,
           @NotMustCount int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Quest where [ID] = @ID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Quest]
   SET [ID] = @ID
      ,[QuestID] = @QuestID
      ,[Title] = @Title
      ,[Detail] = @Detail
      ,[Objective] = @Objective
      ,[NeedMinLevel] = @NeedMinLevel
      ,[NeedMaxLevel] = @NeedMaxLevel
      ,[PreQuestID] = @PreQuestID
      ,[NextQuestID] = @NextQuestID
      ,[IsOther] = @IsOther
      ,[CanRepeat] = @CanRepeat
      ,[RepeatInterval] = @RepeatInterval
      ,[RepeatMax] = @RepeatMax
      ,[RewardGP] = @RewardGP
      ,[RewardGold] = @RewardGold
      ,[RewardGiftToken] = @RewardGiftToken
      ,[RewardOffer] = @RewardOffer
      ,[RewardRiches] = @RewardRiches
      ,[RewardBuffID] = @RewardBuffID
      ,[RewardBuffDate] = @RewardBuffDate
      ,[RewardMoney] = @RewardMoney
      ,[Rands] = @Rands
      ,[RandDouble] = @RandDouble
      ,[TimeMode] = @TimeMode
      ,[StartDate] = @StartDate
      ,[EndDate] = @EndDate
      ,[MapID] = @MapID
      ,[AutoEquip] = @AutoEquip
      ,[RewardMedal] = @RewardMedal
      ,[Rank] = @Rank
      ,[StarLev] = @StarLev
      ,[NotMustCount] = @NotMustCount
 WHERE [ID] = @ID
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Quest]
           ([ID]
           ,[QuestID]
           ,[Title]
           ,[Detail]
           ,[Objective]
           ,[NeedMinLevel]
           ,[NeedMaxLevel]
           ,[PreQuestID]
           ,[NextQuestID]
           ,[IsOther]
           ,[CanRepeat]
           ,[RepeatInterval]
           ,[RepeatMax]
           ,[RewardGP]
           ,[RewardGold]
           ,[RewardGiftToken]
           ,[RewardOffer]
           ,[RewardRiches]
           ,[RewardBuffID]
           ,[RewardBuffDate]
           ,[RewardMoney]
           ,[Rands]
           ,[RandDouble]
           ,[TimeMode]
           ,[StartDate]
           ,[EndDate]
           ,[MapID]
           ,[AutoEquip]
           ,[RewardMedal]
           ,[Rank]
           ,[StarLev]
           ,[NotMustCount])
     VALUES
           (@ID,
           @QuestID,
           @Title,
           @Detail,
           @Objective,
           @NeedMinLevel,
           @NeedMaxLevel,
           @PreQuestID,
           @NextQuestID,
           @IsOther,
           @CanRepeat,
           @RepeatInterval,
           @RepeatMax,
           @RewardGP,
           @RewardGold,
           @RewardGiftToken,
           @RewardOffer,
           @RewardRiches,
           @RewardBuffID,
           @RewardBuffDate,
           @RewardMoney,
           @Rands,
           @RandDouble,
           @TimeMode,
           @StartDate,
           @EndDate,
           @MapID,
           @AutoEquip,
           @RewardMedal,
           @Rank,
           @StarLev,
           @NotMustCount)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
