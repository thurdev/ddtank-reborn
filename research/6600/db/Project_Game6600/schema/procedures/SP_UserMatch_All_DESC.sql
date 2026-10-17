-- SQL_STORED_PROCEDURE dbo.SP_UserMatch_All_DESC (modified 2015-01-25T14:04:48.293)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<炼化表:显示全部炼化>
-- =============================================
CREATE Procedure [dbo].[SP_UserMatch_All_DESC]
as
SELECT [UserID],[totalPrestige]
FROM [dbo].[Sys_User_Match_Info] order by [totalPrestige] desc

GO
