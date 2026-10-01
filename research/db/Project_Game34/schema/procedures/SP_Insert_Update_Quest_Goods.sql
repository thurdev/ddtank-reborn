-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Quest_Goods (modified 2021-06-04T01:29:18.210)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Quest_Goods] 
		   @QuestID int,
           @RewardItemID int,
           @IsSelect bit,
           @RewardItemValid int,
           @RewardItemCount int,
           @StrengthenLevel int,
           @AttackCompose int,
           @DefendCompose int,
           @AgilityCompose int,
           @LuckCompose int,
           @IsCount bit,
           @IsBind bit,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Quest_Goods where [QuestID] = @QuestID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Quest_Goods]
   SET [QuestID] = @QuestID
      ,[RewardItemID] = @RewardItemID
      ,[IsSelect] = @IsSelect
      ,[RewardItemValid] = @RewardItemValid
      ,[RewardItemCount] = @RewardItemCount
      ,[StrengthenLevel] = @StrengthenLevel
      ,[AttackCompose] = @AttackCompose
      ,[DefendCompose] = @DefendCompose
      ,[AgilityCompose] = @AgilityCompose
      ,[LuckCompose] = @LuckCompose
      ,[IsCount] = @IsCount
      ,[IsBind] = @IsBind
 WHERE [QuestID] = @QuestID and [RewardItemID] = @RewardItemID
    
return 1  
end
--add
else 
begin
INSERT INTO [dbo].[Quest_Goods]
           ([QuestID]
           ,[RewardItemID]
           ,[IsSelect]
           ,[RewardItemValid]
           ,[RewardItemCount]
           ,[StrengthenLevel]
           ,[AttackCompose]
           ,[DefendCompose]
           ,[AgilityCompose]
           ,[LuckCompose]
           ,[IsCount]
           ,[IsBind])
     VALUES
           (@QuestID,
           @RewardItemID,
           @IsSelect,
           @RewardItemValid,
           @RewardItemCount,
           @StrengthenLevel,
           @AttackCompose,
           @DefendCompose,
           @AgilityCompose,
           @LuckCompose,
           @IsCount,
           @IsBind)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
