-- SQL_STORED_PROCEDURE dbo.SP_QuestData_Add (modified 2021-06-04T05:18:35.620)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：用户接受一条任务>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_QuestData_Add]   
 @UserId int, 
 @QuestID int, 
 @CompletedDate DateTime,
 @IsComplete bit, 
 @Condition1 int, 
 @Condition2 int, 
 @Condition3 int, 
 @Condition4 int, 
 @IsExist bit,
 @RepeatFinish int,
 @RandDobule int
as
declare  
	@temp int,
	@tempComplete bit,
	@canRepeat bit
select @temp = count(*)  from QuestData where UserId=@UserId and QuestID=@QuestID 
if @temp=0 
   begin 
     INSERT INTO QuestData(UserId, QuestID,CompletedDate,IsComplete,Condition1,Condition2,Condition3,Condition4,IsExist,RepeatFinish,RandDobule) 
     VALUES(@UserId, @QuestID,@CompletedDate,@IsComplete,@Condition1,@Condition2,@Condition3,@Condition4,@IsExist,@RepeatFinish,@RandDobule) 
 end 
 else
   begin 
	   select @tempComplete=IsComplete from QuestData where UserId=@UserId and QuestID=@QuestID 
	   select @canRepeat=CanRepeat from [Project_Game34].[dbo].Quest where ID=@QuestID
	   
	   if @tempComplete=0 OR @canRepeat=1
		begin
		 UPDATE QuestData Set CompletedDate= @CompletedDate,IsComplete=@IsComplete,Condition1=@Condition1,Condition2=@Condition2,Condition3=@Condition3,Condition4=@Condition4,IsExist=@IsExist,RepeatFinish=@RepeatFinish,RandDobule=@RandDobule  WHERE UserId=@UserId and QuestID=@QuestID
		 end
   end

GO
