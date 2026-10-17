-- SQL_STORED_PROCEDURE dbo.SP_Quest_Condiction_All (modified 2015-01-25T14:04:48.647)
-- =============================================
-- Author:		<Xiaov>
-- ALTER  date: <2009-11-19>
-- Description:	<任务信息：任务条件表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Quest_Condiction_All]
 AS  
   begin 
     select * from Quest_Condiction
   end

GO
