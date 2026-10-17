-- SQL_STORED_PROCEDURE dbo.SP_Quest_Single (modified 2015-01-25T14:04:48.643)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：加载一条任务信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Quest_Single]
@QuestId int
 AS  
   begin 
     select * from Quest where QuestId=@QuestId
   end

GO
