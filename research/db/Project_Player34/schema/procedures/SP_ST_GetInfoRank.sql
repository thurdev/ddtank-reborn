-- SQL_STORED_PROCEDURE dbo.SP_ST_GetInfoRank (modified 2021-06-04T05:18:35.697)








-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ST_GetInfoRank]
		@TemplateID int
AS  
select * from  [dbo].[Sys_Users_DanhHieu] where [Template] = @TemplateID









GO
