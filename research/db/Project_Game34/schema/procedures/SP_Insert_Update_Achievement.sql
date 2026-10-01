-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Achievement (modified 2021-06-04T01:29:18.067)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Achievement] 
		   @ID int,
           @PlaceID int,
           @Title nvarchar(100),
           @Detail nvarchar(500),
           @NeedMinLevel int,
           @NeedMaxLevel int,
           @PreAchievementID nvarchar(100),
           @IsOther int,
           @AchievementType int,
           @CanHide bit,
           @StartDate datetime,
           @EndDate datetime,
           @AchievementPoint int,
		   @IsActive int,
           @PicID int,
           @IsShare bit,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Achievement where [ID] = @ID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Achievement]
   SET [ID] = @ID
      ,[PlaceID] = @PlaceID
      ,[Title] = @Title
      ,[Detail] = @Detail
      ,[NeedMinLevel] = @NeedMinLevel
      ,[NeedMaxLevel] = @NeedMaxLevel
      ,[PreAchievementID] = @PreAchievementID
      ,[IsOther] = @IsOther
      ,[AchievementType] = @AchievementType
      ,[CanHide] = @CanHide
      ,[StartDate] = @StartDate
      ,[EndDate] = @EndDate
      ,[AchievementPoint] = @AchievementPoint
      ,[IsActive] = @IsActive
      ,[PicID] = @PicID
      ,[IsShare] = @IsShare
 WHERE [ID] = @ID
    
return 1  
end
--add ach
else 
begin
INSERT INTO [dbo].[Achievement]
           ([ID]
           ,[PlaceID]
           ,[Title]
           ,[Detail]
           ,[NeedMinLevel]
           ,[NeedMaxLevel]
           ,[PreAchievementID]
           ,[IsOther]
           ,[AchievementType]
           ,[CanHide]
           ,[StartDate]
           ,[EndDate]
           ,[AchievementPoint]
           ,[IsActive]
           ,[PicID]
           ,[IsShare])
     VALUES
           (@ID,
           @PlaceID,
           @Title,
           @Detail,
           @NeedMinLevel,
           @NeedMaxLevel,
           @PreAchievementID,
           @IsOther,
           @AchievementType,
           @CanHide,
           @StartDate,
           @EndDate,
           @AchievementPoint,
           @IsActive,
           @PicID,
           @IsShare)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
