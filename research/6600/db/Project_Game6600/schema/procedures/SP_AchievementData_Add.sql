-- SQL_STORED_PROCEDURE dbo.SP_AchievementData_Add (modified 2015-04-21T15:08:29.323)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：用户接受一条任务>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_AchievementData_Add]   
 @UserID int, 
 @AchievementID int, 
 @CompletedDate DateTime,
 @IsComplete bit
as
declare  
	@temp int,
	@tempComplete bit
select @temp = count(*)  from AchievementData where UserID=@UserID and AchievementID=@AchievementID
if @temp=0 
   begin 
     INSERT INTO [Db_Tank].[dbo].[AchievementData]
           ([UserID]
           ,[AchievementID]
           ,[CompletedDate]
           ,[IsComplete])
     VALUES
           (@UserID
           ,@AchievementID
           ,@CompletedDate
           ,@IsComplete)
 end 
 else
   begin 
	   select @tempComplete=IsComplete from AchievementData where UserID=@UserID and AchievementID=@AchievementID
	   if @tempComplete=0
		begin
		 UPDATE [Db_Tank].[dbo].[AchievementData]
   SET [CompletedDate] = @CompletedDate
      ,[IsComplete] = @IsComplete  WHERE UserID=@UserID and AchievementID=@AchievementID
		 end
   end


GO
