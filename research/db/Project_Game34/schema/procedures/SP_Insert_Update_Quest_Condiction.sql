-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Quest_Condiction (modified 2021-06-04T01:29:18.203)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Quest_Condiction] 
		   @QuestID int,
           @CondictionID int,
           @CondictionType int,
           @CondictionTitle nvarchar(200),
           @Para1 int,
           @Para2 int,
           @isOpitional bit,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Quest_Condiction where [QuestID] = @QuestID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Quest_Condiction]
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
begin
INSERT INTO [dbo].[Quest_Condiction]
           ([QuestID]
           ,[CondictionID]
           ,[CondictionType]
           ,[CondictionTitle]
           ,[Para1]
           ,[Para2]
           ,[isOpitional])
     VALUES
           (@QuestID,
           @CondictionID,
           @CondictionType,
           @CondictionTitle,
           @Para1,
           @Para2,
           @isOpitional)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
