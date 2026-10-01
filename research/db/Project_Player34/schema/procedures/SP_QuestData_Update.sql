-- SQL_STORED_PROCEDURE dbo.SP_QuestData_Update (modified 2021-06-04T05:18:35.633)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：更新用户任务数据>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_QuestData_Update]
 @UserId int, 
 @QuestId int, 
 @ConditionCount int, 
 @IsComplete bit, 
 @CompletedDate DateTime
as
   begin 
   Select 1
--     UPDATE QuestData Set  ConditionCount=@ConditionCount, IsComplete=@IsComplete, CompletedDate=@CompletedDate WHERE UserId=@UserId and QuestId=@QuestId
   end







GO
