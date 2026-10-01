-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_AchievementCondition (modified 2021-06-04T01:29:18.080)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_AchievementCondition] 
		   @AchievementID int,
           @CondictionID int,
           @CondictionType int,
           @Condiction_Para1 nvarchar(150),
           @Condiction_Para2 int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.AchievementCondition where [AchievementID] = @AchievementID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[AchievementCondition]
   SET [AchievementID] = @AchievementID
      ,[CondictionID] = @CondictionID
      ,[CondictionType] = @CondictionType
      ,[Condiction_Para1] = @Condiction_Para1
      ,[Condiction_Para2] = @Condiction_Para2
 WHERE [AchievementID] = @AchievementID and [CondictionID] = @CondictionID
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[AchievementCondition]
           ([AchievementID]
           ,[CondictionID]
           ,[CondictionType]
           ,[Condiction_Para1]
           ,[Condiction_Para2])
     VALUES
           (@AchievementID,
           @CondictionID,
           @CondictionType,
           @Condiction_Para1,
           @Condiction_Para2)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
