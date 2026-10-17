-- SQL_STORED_PROCEDURE dbo.SP_QuestData_Add (modified 2015-01-25T14:04:48.640)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：用户接受一条任务>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_QuestData_Add]   
 @UserId int, 
 @QuestId int, 
 @CompletedDate DateTime,
 @IsComplete bit, 
 @Condition1 int, 
 @Condition2 int, 
 @Condition3 int, 
 @Condition4 int, 
 @Condition5 int, 
 @Condition6 int, 
 @Condition7 int, 
 @Condition8 int, 
 @IsExist bit,
 @RepeatFinish int,
 @RandDobule int,
 @QuestLevel int
as
declare  
	@temp int,
	@tempComplete bit
select @temp = count(*)  from QuestData where UserId=@UserId and QuestId=@QuestId 
if @temp=0 
   begin 
     INSERT INTO QuestData(UserId, QuestId,CompletedDate,IsComplete,Condition1,Condition2,Condition3,Condition4,IsExist,RepeatFinish,RandDobule,QuestLevel,Condition5,Condition6,Condition7,Condition8) 
     VALUES(@UserId, @QuestId,@CompletedDate,@IsComplete,@Condition1,@Condition2,@Condition3,@Condition4,@IsExist,@RepeatFinish,@RandDobule,@QuestLevel,@Condition5,@Condition6,@Condition7,@Condition8) 
 end 
 else
   begin 
	   select @tempComplete=IsComplete from QuestData where UserId=@UserId and QuestId=@QuestId 
	   if @tempComplete=0
		begin
		 UPDATE QuestData Set CompletedDate= @CompletedDate,IsComplete=@IsComplete,Condition1=@Condition1,Condition2=@Condition2,Condition3=@Condition3,Condition4=@Condition4,IsExist=@IsExist,RepeatFinish=@RepeatFinish,RandDobule=@RandDobule,Condition5=@Condition5,Condition6=@Condition6,Condition7=@Condition7,Condition8=@Condition8  WHERE UserId=@UserId and QuestId=@QuestId
		 end
   end

GO
