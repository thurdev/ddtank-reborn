-- SQL_STORED_PROCEDURE dbo.SP_Lightriddle_Quest_All (modified 2015-01-25T14:04:48.580)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取当前用户的Buff>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Lightriddle_Quest_All]
 AS  
   begin 
     select * from Lightriddle_Quest
   end

GO
