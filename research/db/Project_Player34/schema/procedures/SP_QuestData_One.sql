-- SQL_STORED_PROCEDURE dbo.SP_QuestData_One (modified 2021-06-04T05:18:35.630)







-- =============================================
-- Author:		<Author,,Name>
-- Create date: <2009-10-11>
-- Description:	<获取当前玩家的系统中存在的任务>
-- =============================================
CREATE PROCEDURE [dbo].[SP_QuestData_One]
 @UserID int,
 @QuestID int
AS  
Begin
     select * from QuestData  where UserID = @UserID and IsExist = 1 and QuestID = @QuestID
End








GO
