-- SQL_STORED_PROCEDURE dbo.SP_UserMatch_All_DESC (modified 2021-06-04T05:18:36.003)





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
