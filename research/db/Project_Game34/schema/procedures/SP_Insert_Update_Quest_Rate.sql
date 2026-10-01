-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Quest_Rate (modified 2021-06-04T01:29:18.217)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Quest_Rate] 		   
           @BindMoneyRate nvarchar(50),
           @ExpRate nvarchar(50),
           @GoldRate nvarchar(50),
           @ExploitRate nvarchar(50),
           @CanOneKeyFinishTime int
           
           
AS
/*
declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Quest_Rate where [QuestID] = @QuestID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Quest_Rate]
   SET [QuestID] = @QuestID
      ,[CondictionID] = @CondictionID
      ,[CondictionType] = @CondictionType
      ,[CondictionTitle] = @CondictionTitle
      ,[Para1] = @Para1
      ,[Para2] = @Para2
      ,[isOpitional] = @isOpitional
 WHERE [QuestID] = @QuestID and [CondictionID] = @CondictionID
    
return 1  
end
--add Ball
else 
*/
begin
INSERT INTO [dbo].[Quest_Rate]
           ([BindMoneyRate]
           ,[ExpRate]
           ,[GoldRate]
           ,[ExploitRate]
           ,[CanOneKeyFinishTime])
     VALUES
           (@BindMoneyRate,
           @ExpRate,
           @GoldRate,
           @ExploitRate,
           @CanOneKeyFinishTime)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
