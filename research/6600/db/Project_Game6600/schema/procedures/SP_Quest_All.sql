-- SQL_STORED_PROCEDURE dbo.SP_Quest_All (modified 2015-01-25T14:04:48.647)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：任务模板>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Quest_All]
 AS  
   begin 
     select * from Quest
   end

GO
