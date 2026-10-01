-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Achievement_Goods (modified 2021-06-04T01:29:18.073)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Achievement_Goods] 
		   @AchievementID int,
           @RewardType int,
           @RewardPara nvarchar(500),
           @RewardValueId int,
           @RewardCount int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Achievement_Goods where [AchievementID] = @AchievementID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Achievement_Goods]
   SET [AchievementID] = @AchievementID
      ,[RewardType] = @RewardType
      ,[RewardPara] = @RewardPara
      ,[RewardValueId] = @RewardValueId
      ,[RewardCount] = @RewardCount
 WHERE [AchievementID] = @AchievementID and [RewardType] = @RewardType
    
return 1  
end
--add
else 
begin
INSERT INTO [dbo].[Achievement_Goods]
           ([AchievementID]
           ,[RewardType]
           ,[RewardPara]
           ,[RewardValueId]
           ,[RewardCount])
     VALUES
           (@AchievementID,
           @RewardType,
           @RewardPara,
           @RewardValueId,
           @RewardCount)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
