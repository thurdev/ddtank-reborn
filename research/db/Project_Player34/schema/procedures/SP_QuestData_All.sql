-- SQL_STORED_PROCEDURE dbo.SP_QuestData_All (modified 2021-06-04T05:18:35.627)


-- =============================================
-- Author:		<Author,,Name>
-- Create date: <2009-10-11>
-- Description:	<获取当前玩家的系统中存在的任务>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_QuestData_All]
 @UserID int
AS  
Begin
     select * from QuestData  where UserID = @UserID and IsExist = 1
End








GO
