-- SQL_STORED_PROCEDURE dbo.Sp_Sys_QuestData (modified 2021-06-04T05:18:35.767)



-- =============================================
-- Author:		<Xaiov>
-- ALTER  date: <2010-02-25>
-- Description:	<清除用户任务过期数据>
-- =============================================
CREATE PROCEDURE [dbo].[Sp_Sys_QuestData] AS
Delete FROM QuestData where isexist=0







GO
