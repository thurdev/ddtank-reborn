-- SQL_STORED_PROCEDURE dbo.SP_Drop_Condiction_All (modified 2015-01-25T14:04:48.527)
-- =============================================
-- Author:		<Xiaov>
-- ALTER  date: <2009-11-19>
-- Description:	<任务信息：掉落条件表>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Drop_Condiction_All]
 AS  
   begin 
     select * from Drop_Condiction
   end

GO
